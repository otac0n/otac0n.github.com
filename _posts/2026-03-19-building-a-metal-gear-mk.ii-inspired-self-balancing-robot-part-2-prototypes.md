---
layout: post
title: 'Building a Metal Gear Mk.II-Inspired Self-Balancing Robot (Part 2: Prototypes)'
tags:
- robotics
---

In the [last post](/blog/2026/03/11/building-a-metal-gear-mk.ii-inspired-self-balancing-robot-part-1-system-design.html) I went over my inspiration and goals for the Mk.II project. This post covers the steps I took to get the various prototypes up and running. I will be including sponsored links to the parts I purchased; if you use these links it will help me continue making content like this!

## Parts

At the end of August, after getting my plan reviewed by the experts, I eagerly ordered my first batch of parts.

![System Design (ordered)](/blog/images/mk.ii/foc-balancer-system-v2.png)
<div class="alt" style="display: none"><pre><code>
language: mermaid
graph TB
  battery[4S LIPO]
  splitter[XT90 Splitter]
  step_down[5V 5A step-down]
  rail_14v_in@{ shape: junction }
  rail_5v_in@{ shape: junction }
  battery -- 14.8V --> splitter
  splitter -- 14.8V --> rail_14v_in
  splitter -- 14.8V --> step_down
  step_down -- 5V --> rail_5v_in
  high_level_controller[Pi 5 / Jetson Orin]
  camera
  screen
  low_level_controller[STM32F411E-DISCOVERY]
  motor_controller_left[SimpleFOC Mini]
  motor_controller_right[SimpleFOC Mini]
  motor_left[GM4108 BLDC]
  motor_right[GM4108 BLDC]
  sensor_left[AS5047P]
  sensor_right[AS5047P]
  rail_5v_1@{ shape: junction } -- 5V --> high_level_controller
  rail_5v_2@{ shape: junction } -- 5V --> low_level_controller
  high_level_controller -- Direction --> low_level_controller
  camera -- A/V --> high_level_controller
  high_level_controller -- UI --> screen
  low_level_controller -- Telemetry --> high_level_controller
  low_level_controller -- PWM --> motor_controller_left
  rail_14v_1@{ shape: junction } -- 14.8V --> motor_controller_left
  motor_controller_left --> motor_left
  motor_left --> sensor_left
  rail_5v_3@{ shape: junction } -- 5V --> sensor_left
  sensor_left -- ABZ --> low_level_controller
  low_level_controller -- PWM --> motor_controller_right
  rail_14v_2@{ shape: junction } -- 14.8V --> motor_controller_right
  motor_controller_right --> motor_right
  motor_right --> sensor_right
  rail_5v_4@{ shape: junction } -- 5V --> sensor_right
  sensor_right -- ABZ --> low_level_controller
</code></pre></div>

I sent in orders for the MCU, the motors, sensors, motor controllers, and a few other things:

- Boards
  - [STM32F411E-DISCO](https://www.st.com/en/evaluation-tools/32f411ediscovery.html)
  - [GM4108H-120T](https://shop.iflight.com/ipower-motor-gm4108h-120t-brushless-gimbal-motor-pro217)
  - 2x [SimpleFOC Mini](https://amzn.to/4cPbORQ)
  - 2x [AS5047P Magnetic Encoder](https://amzn.to/4lzFlkV)
  - ~~[5V Regulator](https://amzn.to/479lClZ)~~ *not used in current design*
- Hardware
  - [M3 Screws & Nuts (black)](https://amzn.to/41cBa4V)
  - [M3 Screws & Nuts (silver)](https://amzn.to/4cQIH0s)
- Power
  - [4x 2S Lipo Batteries](https://amzn.to/4rABl53)
  - [XT30 Connectors](https://amzn.to/4lxgxd2)
  - [20AWG red/black](https://amzn.to/4sWHqK8)
  - [18AWG red/black](https://amzn.to/4scgLZI)

## Motion Sensing

While I waited for parts to arrive, I began modelling the Mk.II in FreeCAD. I learned quite a bit here even beyond the prototyping phase, and it deserves a post of its own. Stay tuned for more on that in a later installment.

As soon as I got the STM32 board, it was time to get some coding done. I surveyed the embedded development landscape for operating systems and IDEs. What I found was that [Platform.IO](https://platformio.org/) is pretty much the standard for embedded software, enabling a single project to target multiple boards.

I created a project but couldn't find Arduino support for my board. I *did* find support for the STM32F407-DISCO board which was the previous hardware revision. I guessed they were compatible, so I moved forward with that as a project starting point. It didn't take long before issues started to crop up, likely due to the different MCU settings between the boards. I felt I had to pivot to ZephyrOS on the STM32F411-DISCO, and luckily Platform.IO made this relatively painless:

Before:

    [env:disco_f411ve]
    platform = ststm32
    board = disco_f407vg ;disco_f411ve
    framework = arduino

After:

    [env:disco_f411ve]
    platform = ststm32
    board = disco_f411ve
    framework = zephyr

The first prototype I wanted to create was something that could display the state of the accelerometer. This was very straight-forward in Zephyr, taking only a few minutes to implement:

    static const struct device *const accelerometer = DEVICE_DT_GET_ONE(st_lis2dh);
    ...
    IMUReading reading;
    sensor_sample_fetch(accelerometer);
    reading.accelerometer[0] = sensor_value_to_double(&val[0]);
    reading.accelerometer[1] = sensor_value_to_double(&val[1]);
    reading.accelerometer[2] = sensor_value_to_double(&val[2]);
    
Combined with a basic `led_service`, this was enough to build a "this-way-up" demo:

{% include videoPlayer.html url='/blog/images/mk.ii/this-way-up.mp4' width=480 height=600 %}

Next, I wanted to implement something similar for the gyroscope. Only one problem: Zephyr didn't know about the STM32's gyroscope. It took me about an hour to figure out how to inform Zephyr about the device. I was able to reuse most of the details from the STM32F407 board configuration.

    &spi1 {
        pinctrl-0 = <&spi1_nss_pa4 &spi1_sck_pa5
                    &spi1_miso_pa6 &spi1_mosi_pa7>;
        pinctrl-names = "default";
        status = "okay";
        cs-gpios = <&gpioe 3 GPIO_ACTIVE_LOW>;
        i3g4250d@0 {
            compatible = "st,i3g4250d";
            reg = <0>;
            spi-max-frequency = <1000000>;
        };
    };

I [sent a PR](https://github.com/zephyrproject-rtos/zephyr/pull/95133) so that others could benefit and then set my focus on integrating the magnetic sensors. I added an `angle_service` to the project that was responsible for the AS5047P sensors. The sensors support several modes: ABZ, PWM, UVW, and I²C. If you'll recall, in the last post I received advice from the SimpleFOC forums that ABZ (aka ABI or Quadrature) was the lowest overhead. Adding this sensor to my Zephyr project as a quadrature decoder was also quite easy:

    &timers3 {
        status = "okay";

        qdec: qdec {
            status = "okay";
            pinctrl-0 = <&tim3_ch1_pb4 &tim3_ch2_pb5>;
            pinctrl-names = "default";
            st,counts-per-revolution = <1000>;
        };
    };

Using a cheap fridge magnet, I was able to show that the sensor was working:

{% include videoPlayer.html url='/blog/images/mk.ii/magnetic-encoder-demo.mp4' width=600 height=600 %}

A couple of times I managed to short out the system by touching the sensor power leads with the magnet's metal housing. I didn't realize it at the time, but this was a clear indication that my electronics hygiene needed to improve.

## Motion Control

In order to wire up a full motion-control prototype, I ordered a few more things:
  - [24AWG assorted colors](https://amzn.to/3PJZBnL)
  - [DuPont Connectors](https://amzn.to/3PgmxLu)
  - [Key Switches](https://amzn.to/4rCO07u)
  - [5A Slow Blow Fuse](https://amzn.to/4uxCiOh)
  - [Glass/Nylon Bearings](https://amzn.to/4bQWIdt)
  - ~~[10k Resistors](https://amzn.to/4bs0icM)~~ *get an assorted set first, replace with specific values*
    - [Assorted Resistors](https://amzn.to/4biP5wh)

My first soldering project was the pair of SimpleFOC minis. The purpose of these little boards is to translate low-voltage signals (3.3v pulses) into higher voltages (~15V) sent to the motor leads.

![SimpleFOC Soldering](/blog/images/mk.ii/simple-foc-solder.jpg)

If you have any soldering experience, you can probably tell there are a few things wrong:
  - Several connections have too much solder and have bulged up.
  - One of the joints appears cold. (nFT on the right board)
  - Flux residue not cleaned off.

Don't worry too much about this, as I ended up rewiring this board directly and these errors didn't impact the prototyping progress.

From the software side things weren't simple. On one hand, I had fully working sensors under ZephyrOS, but on the other hand, I had a proof of concept in the way of the Arduino SimpleFOC Balancer project. At the time, there was only a single lonesome Zephyr project doing FOC: [Spinner](https://github.com/teslabs/spinner). I had to decide immediately whether I would attempt to fill the feature gaps to enable a SimpleFOC-like API on Zephyr or to add Arduino support for my board.

I decided, since the process to add a new STM32 Arduino variant was [well documented](https://github.com/stm32duino/Arduino_Core_STM32/wiki/Add-a-new-variant-%28board%29), that adding the board aligned better with my skillset. While this did set me back several days and a couple of dollars for a [CP2101 USB UART](https://amzn.to/3NyFk3T) serial adapter, I do think that [my contribution](https://github.com/stm32duino/Arduino_Core_STM32/pull/2805) here has already been beneficial to the community. I wasn't able to convince my local copy of Platform.IO to use my custom build of STM32Duino, so unfortunately I had to avoid Platform.IO for anything except serial debugging from here out.

Nevertheless, after adding a `motor_service` I was able to get a basic SimpleFOC open-loop motion demo running:

{% include videoPlayer.html url='/blog/images/mk.ii/open-loop.mp4' width=600 height=800 %}

The periodic pausing you see there is due to one out of three phases conflicting with other onboard devices. After switching the signal PWM channels to unused pins, I got smooth open-loop control working: 

{% include videoPlayer.html url='/blog/images/mk.ii/open-loop-motion-control.mp4' width=600 height=800 %}

## The Missing Magnet

I purchased some [Gold Filament](https://amzn.to/4bhpWCa) for the prototype. I always equip Gold in Kojima's Games and wanted to pay homage.

<table>
  <tr>
    <td><img src="/blog/images/mk.ii/gold-mgsv.jpg" alt="Metal Gear Solid V - Gold Loadout"/></td>
    <td><img src="/blog/images/mk.ii/gold-death-stranding.jpg" alt="Death Stranding - Gold Loadout"/></td>
  </tr>
</table>

My friend Arthur was kind enough to 3D-print a few of my designs, so I was now able to integrate all of the leg parts into a single package.

![Ankle Sensor Placement](/blog/images/mk.ii/ankle-sensor.jpg)

![Ankle Assembled](/blog/images/mk.ii/ankle-assembled.jpg)

![Ankle Powered](/blog/images/mk.ii/ankle-powered.jpg)

I powered up the experiment, saw the motors move, but the angle sensors read zero. I was clearly missing something. I once again implored the help of the SimpleFOC Discord channel. I had assumed was that the motors' own magnetic fields would be captured by the sensor. The AS5047P magnetic sensor does after offer the "UVW" mode, which I understood to be reading the field strength of each motor's coils. What I did not realize is that this is merely an emulation mode offered by the chip. The chip itself requires a magnet positioned directly above it to work. And it can't just be any old magnet either; it has to be a diametrically magnetized magnet.

![Mk.III Slide](/blog/images/mk.ii/mk.iii-slide.jpg)

If I wanted to stay true to the Mk.II/III design, I had to mount the inner wheel covers *through* the motor shaft. The gimbal motors I'm using have room for that, but a magnet would just block the shaft. This meant that, suddenly, I had a very very unique magnet requirement:
 
  - Ring magnet
  - Diametrically magnetized
  - Small
     - < ~3 mm thick
     - < ~10 mm outer diameter
  - As wide of an inner diameter as possible

I searched through every magnet website around but I could not find anything that fit perfectly within my original design. But, as luck would have it, I did find exactly [ONE option](https://www.buyneomagnets.com/p/9mm-od-x-5mm-id-x-3mm-thick-diametrically-magnetized-ring-magnets-n38-strong-neodymium-ring-magnets-20-pack/) that was close. It had a much smaller inner diameter that I like, but I wagered: with a small redesign and a change in material, I could make it work.

Once they arrived and were installed, I had every individual component working.

![Magnet Fit](/blog/images/mk.ii/magnet-fit.jpg)

{% include videoPlayer.html url='/blog/images/mk.ii/sensor-working.mp4' width=600 height=750 %}

## The Hygiene Lesson

I was still depending on my friend Arthur for 3D prints, so I figured the easiest way to get a fully integrated prototype assembled would be to build the body out of cardboard. I grabbed a cardboard box, measured up and cut holes for mounting the ankles, and threw it all together:

![Huh, it's just a box.](/blog/images/mk.ii/just-a-box.jpg)

I arranged a meet-up to get the 3D printed wheels & tires at our local makerspace. And it was there that the poor electronics hygiene caught up with me. I assembled the wheels, powered the bot on, and... a twitch and then it almost immediately fell silent.

I pulled the power and hooked up USB serial to assess the damage. The board gave me random text in return. I fried the brains and the sensors. Oof. Most likely what happened is that one of the 15V leads from the step-down must have contacted one of the lower-voltage data lines on the STM32. There was nowhere to secure the voltage regulator inside the box, and I had not protected the leads.

At this point, I decided I had to make some specific changes. Going forward, I decided:

  1. All power leads must be sleeved.
  2. Any unshielded male power connector must not have power when disconnected.
      - Follow standards for XT connectors.
  3. All power leads must be secured to the chassis.

I designed an enclosure with plenty of tie-down points and asked for Arthur to print it. I also reordered the fried parts: 1 STM32 board and 2 AS5047P sensors (all of my low-voltage devices). It didn't take long for me to reconsider my choice of STM32. I wanted the bot to be controlled like it is in the game, and this meant using a Bluetooth controller. In parallel, I ordered a few extra parts that could be here quicker.

- ~~[ESP32-S3-DevKitC-1](https://amzn.to/4rHftoB)~~ *BLE only, not used in latest design*
- [WiFi Antenna](https://amzn.to/4rDjpq8)
- [INA219 Power Monitor](https://amzn.to/3NATH7M)
- [3.3V Regulator](https://amzn.to/4dpaLbu)
- [ICM-42688 IMU](https://amzn.to/41bLxpB)

This further hints at some design changes that we will see in later posts.

## Coming Up...

In the upcoming posts, I'll be covering my CAD journey, traction, PID tuning, designing for 3D printing, and more!

Stay tuned.
