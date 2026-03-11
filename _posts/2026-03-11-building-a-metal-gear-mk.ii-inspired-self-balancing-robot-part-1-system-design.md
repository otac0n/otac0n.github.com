---
layout: post
title: 'Building a Metal Gear Mk.II-Inspired Self-Balancing Robot (Part 1: System Design)'
tags:
- robotics
---

## Inspiration

At the end of July last year I happened across [a Reddit post](https://www.reddit.com/r/EngineeringPorn/comments/1m8ztyc/my_mini_robomate_is_finally_alive/) showing off the performance of a two-wheeled balancer robot. At the time I was still playing through *Metal Gear Solid 4*, so I immediately noticed the similarities between their robots and the [Metal Gear Mk.II](https://metalgear.fandom.com/wiki/Metal_Gear_Mk._II):

![Comparison of Robomates and Mk.II](/blog/images/mk.ii/robomates-comp.jpg) 

I eagerly joined their subreddit and Discord channel to see if their bots were customizable. In the game, the Mk.II (and later the Mk.III) is a friendly companion that the player can pilot. He's nimble on his wheels and can act as your eyes and hands. This is a perfect fit to Robomate's bring-your-own controller approach. However, their kits weren't available yet.

I was too eager to wait, so I started planning my own bot. After a bit of searching, I found a couple of preexisting projects that seemed like good places to start. The most similar project to Mk.II was [MABEL](https://github.com/raspibotics/MABEL), with its independent legs.  However, [SimpleFOCBalancer](https://github.com/simplefoc/Arduino-FOC-balancer) won me over by its simplicity as a starting point.

## Goals

My goals with this project were to (A) learn basic robotics and (B) achieve as close of a representation of Mk.II as I could manage. Since I had zero practical experience with robotics and a pretty abysmal electronics track record, I knew I needed to take it slow. Mistakes would be made.

I paved this basic roadmap:

  1. IMU + Motor prototype
  2. Simple 2-wheel prototype
  3. Full-size 2-wheel bot
  4. Independent leg movement
  5. Computer Vision integration

#4 and #5 on this list are long-term goals with the project.  A bot similar to the Robomates implementation would be wonderful, but even achieving #1 would be a win.

To save costs, I hoped to reuse as many of the prototype components in the final bot as possible. So, based mostly on the Simple FOC Arduino Balancer project, I drafted this design:

![System Desing (draft)](/blog/images/mk.ii/foc-balancer-system-v1.png)
<div class="alt" style="display: none"><pre><code>
language: mermaid
graph TB
  battery[4S LIPO]
  splitter[XT90 Splitter]
  step_down[5V 5A Step-Down]
  rail_14v_in@{ shape: junction }
  rail_5v_in@{ shape: junction }
  battery -- 14.8V --> splitter
  splitter -- 14.8V --> rail_14v_in
  splitter -- 14.8V --> step_down
  step_down -- 5V --> rail_5v_in
  high_level_controller[Pi 5 / Jetson Orin]
  camera
  screen
  low_level_controller[STM32F3DISCOVERY]
  motor_controller_left[SimpleFOC Mini]
  motor_controller_right[SimpleFOC Mini]
  motor_left[2408 BLDC]
  motor_right[2408 BLDC]
  sensor_left[AS5600]
  sensor_right[AS5600]
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
  sensor_left -- SPI --> low_level_controller
  low_level_controller -- PWM --> motor_controller_right
  rail_14v_2@{ shape: junction } -- 14.8V --> motor_controller_right
  motor_controller_right --> motor_right
  motor_right --> sensor_right
  rail_5v_4@{ shape: junction } -- 5V --> sensor_right
  sensor_right -- SPI --> low_level_controller
</code></pre></div>

  - Raspberry Pi 5 8GB / NVIDIA Jetson Orin Nano (8GB) for computer vision
  - STM32F3DISCOVERY with microcontroller, accelerometer, gyroscope, and motor output/input pins
  - 4S Lipo for power
    - Needs enough juice to run both of the control boards as well as the motors.
  - 5V Step Down for main power rail
    - I had originally planned for both a 5v and 3.3v rail, but decided to unify behind 5v for simplicity since the STM can safely interface with it.
  - Simple FOC Mini motor driver board
  - 2804 BLDC + AS5600 Encoder kit for closed-loop motor control

## Feedback

Before spending any money on this scheme, I wanted to get the input of folks much more knowledgeable than me.  Besides, I was about to travel with my family to the UK and couldn't immediately receive packages. I started sharing my plan on a few robotics Discord servers in search of critical feedback. The SimpleFOC folks [gave me good advice](https://discord.com/channels/927331369137352734/927332503654633572/1399896314682282117):

- @copper280z
  > I would change several things, don’t use the as5600 encoder, it’s not a good choice. Pick something that uses SPI or ABZ for an interface, like the mt6835, as5047, etc. ABZ is preferable for something like this because it’s got the lowest overhead.
  >
  > Next, don’t use the stm32f3, use either an stm32f4, ideally one of the 168-180MHz variants like the f405 or f446, or use an stm32g4. The g4 is better but needs a bit more configuration for max performance because the stm32duino configuration for it is wrong/overly conservative.
  > 
  > The pi/jetson are overkill, but that’s fine. You really want the IMU to be connected to the stm32 and to have it run the balance control loop. The jetson is dramatically faster than the pi5, which might be nice if you want high res video or to run some ai type tasks.
- @runger
  > I also think that for the size robot you'll end up with, given battery, RPi/Jetson, etc you should go one size bigger with the motors, and use something like a 3506 or 4108 size motor

I really appreciate their feedback. @copper280z highlighted that the AS5600 uses either I²C or PWM output which consumes more CPU time than ABZ or SPI. ABZ has the lowest overhead, only changing one or two pins per incremental movement. They also suggested I choose a more powerful MCU (microcontroller). @runger said I needed a LOT more torque.

I narrowed down the list of STM boards based on this feedback and the prices at the time:

  - [STM32F3DISCOVERY](https://www.st.com/en/evaluation-tools/stm32f3discovery.html) - $16.31 - STM32F303VC (72 MHz, 256KB) - but advised against
  - **[STM32F411EDISCOVERY](https://www.st.com/en/evaluation-tools/32f411ediscovery.html) - $15.55 - STM32F411VE (100 MHz, 512KB) - but a bit slower than recommended**
  - [STM32L562QE-DK](https://www.st.com/en/evaluation-tools/stm32l562e-dk.html) - $75.77 - STM32L562QE (110 MHz, 512KB) - way too expensive and too many unwanted features
  - [B-U585I-IOT02A](https://www.st.com/en/evaluation-tools/b-u585i-iot02a.html) - $64 - STM32U585AI (160 MHz, 2MB) - too expensive and too many unwanted features
  - [STM32F407G-DISC1](https://www.st.com/en/evaluation-tools/stm32f4discovery.html) - $20.48 - STM32F407VG (168 MHz, 1MB) - three axis only

I finally settled on the STM32F411DISCOVERY board based on my perception of the usefulness of the on-board hardware contrasted against the price. The AS5048A stood out as a good choice due to its ABZ and SPI modes. The larger of the motors, the GM4108H-120T, fit barely within the wheel dimensions of the Mk.II: perfect.

![System Desing (ordered)](/blog/images/mk.ii/foc-balancer-system-v2.png)
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

## Coming Up...

This project is several firsts for me:
  - my first non-LEGO robotics project
  - my first CAD project
  - my first successful electronics project
  - my first 3D-printing project
  - my first soldering project

In the next post, I will cover the path to the first working prototypes.

Does this design ultimately change? (Spoiler: yes)
