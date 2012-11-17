---
layout: post
title: Slick Analytics with LogParser and SqlBulkCopy
---
## Slick Analytics ##

What do you do when you need to add analytics to your server?  Well, [Google Analytics][1] is a good option, for sure, but it doesn’t capture important, juicy details like bandwidth usage, time to complete requests, cache-hits and so on.  If you need data like this, the best source is going to be the web access logs from your HTTP server.

I’ve taken a look at a few 3rd party tools for creating analytics from these log files, and there are downsides to every one of them.  [Cacti][2] is a pretty good option, however it requires a few things that may not be installed on a Windows server (i.e. PHP, MySQL, RRDTool, and net-snmp).  So, based on the fact that most existing solutions aren’t designed to fit seamlessly into a windows environment, I decided to come up with my own solution.

My solution is based on a couple of off-the-shelf Microsoft products that, if you are running on the Microsoft stack, should already be licensed to you.  Here’s the tool chain:

* IIS
* [Log Parser 2.2][3] (For turning W3C logs into an easy-to-import format.  It may also support Apache W3C logs, but I haven’t tested it.)
* *some secret sauce*
* SQL Server
* SQL Server Reporting Services (or your favorite reporting suite)

So, what is the secret sauce?  Well, SQL Server’s ADO.NET provider exposes the SQL Server Bulk Import API through a class called [SqlBulkCopy][4].  We can easily craft a C# program to take the clean, consistent output of Log Parser and stream it into SQL Server at breakneck speeds.

## Log Parsing ##

First, let’s get Log Parser humming.  Microsoft’s Log Parser accepts SQL-like commands from the command line, and, depending on the particular command, can output to a variety of text formats, execute SQL statements, or create images.  Here is an example of the type of SQL Statement we are looking for:

    SELECT * INTO log1.csv FROM C:\WINDOWS\system32\LogFiles\W3SVC1\ex110101.log

However, as you may be able to tell from the file path, we need to parameterize the source for different IIS sites (e.g. W3SVC9999) and dates (e.g. ex110228.log).  Here is an example command script that can take care of those variables:

    @echo off
    set logparser="C:\Program Files\Log Parser 2.2\LogParser.exe"

    set siteid=%1
    if "%siteid%"=="" set siteid=1
    set logdate=%date:~-2%%date:~4,2%%date:~7,2%
    %logparser% "SELECT * INTO log-w3svc%siteid%-ex%logdate%.csv FROM C:\WINDOWS\system32\LogFiles\W3SVC%siteid%\ex%logdate%.log"

If you run that, you should end up with a CSV file in the current directory, with the current day’s logs for the default IIS website.  It also accepts the website ID number as a parameter on the command line, if you want to run this for more than one site.

Now, here I would like to note that Log Parser supports a mode of operation in which it remembers where it left off in a log file, and skips there on subsequent runs.  However, I have found that, since IIS does not flush its log files and since Windows caches writes, the log will sometimes end half-way through an entry.  When a situation like this arises, Log Parser gets confused and completely fails to properly parse any further entries.  In addition, its SQL support is useful but is unable to do the incremental loads that we would like to do.

## Set-up the Database ##

We need a place to shove that data, but we have two masters to server at this point.  On one hand, we want to transfer as little data to the database server as possible, for obvious reasons.  On the other, we don’t want to have long-running transactions against the main IIS logs table, since it is really made for OLAP and response time of queries is paramount.  This all leans toward a scheme of staging and merging data, rather than cherry-picking new rows to import.  And, even though we don’t want to transfer tons of data, we should be *OK* with 1-day’s-worth in a staging table.  After the data is staged, it can be incrementally moved into the main storage table to reduce the impact on the analytics.

So, we will need two (very similar) tables during our import process: the staging table, and the main storage table.  The main storage table should match the W3C Log format, like so:

    CREATE TABLE [dbo].[w3clog]
    (
        [RowId] bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [LogFilename] varchar(255) NOT NULL,
        [LogRow] int NOT NULL,
        [date] date NULL,
        [time] time(0) NULL,
        [datetime] AS (CONVERT(datetime2(0), date + CONVERT(datetime, time, 0), 0)) PERSISTED,
        [c-ip] varchar(50) NULL,
        [cs-username] varchar(255) NULL,
        [s-sitename] varchar(255) NULL,
        [s-computername] varchar(255) NOT NULL,
        [s-ip] varchar(50) NULL,
        [s-port] varchar(255) NULL,
        [cs-method] varchar(255) NULL,
        [cs-uri-stem] varchar(2048) NULL,
        [cs-uri-query] varchar(max) NULL,
        [sc-status] int NULL,
        [sc-substatus] int NULL,
        [sc-win32-status] bigint NULL,
        [sc-bytes] int NULL,
        [cs-bytes] int NULL,
        [time-taken] bigint NULL,
        [cs-version] int NULL,
        [cs-host] varchar(255) NULL,
        [cs(User-Agent)] varchar(1000) NULL,
        [cs(Cookie)] varchar(max) NULL,
        [cs(Referer)] varchar(2000) NULL,
        [s-event] varchar(255) NULL,
        [s-process-type] varchar(255) NULL,
        [s-user-time] int NULL,
        [s-kernel-time] int NULL,
        [s-page-faults] int NULL,
        [s-total-procs] int NULL,
        [s-active-procs] int NULL,
        [s-stopped-procs] int NULL
    )

The staging table will be an almost identical temp table, with the single omission of the computed ‘datetime’ column.

## Build the Importer ##

So, now it is time to explore the power of the SqlBulkImporter class.

This code is [available on GitHub][5], so there is no need to follow along unless you are building a custom version.  In light of this, I will be skimming over a few of the easier parts.

### Create the Connections ###

Our importer needs to be able to read the CSV files, and spit the data into SQL server. Luckily, both of these are supported by Microsoft’s ADO.NET providers. First, we will use a standard SQL Server connection for the destination database:</p>

![SqlBulkCopy - 1 - WebLogs Connection][6]

Next, we will use an ODBC connection for the CSV files:

    Driver={Microsoft Text Driver (*.txt; *.csv)};Dbq=.;Extensions=csv

![SqlBulkCopy - 2 - CSV Connection][7]

Using the Microsoft Text Driver, it is possible to read CSV files like this:

    var table = new DataTable();
    using (var connection = new OdbcConnection(Settings.Default.ImportDriver))
    {
        var dataAdapter = new OdbcDataAdapter("select * from log1.csv", connection);
        dataAdapter.Fill(table);
    }

### Streaming the Data ###

The little example above is fine-and-dandy for reading the data into memory, but just for the sake of future-proofing, we should aim to stream the data in.  This will ensure that we can import successfully, even during extreme loads. Rather than using a DataAdapter and DataTable, we will opt to read the rows and columns ourselves with the `ExecuteReader` family of methods.

To clear up any uncertainty, here is the order and nesting of the various operations that will need to take place for a successful, performant import:

* Connect to the destination database 
    * Begin a transaction 
        * Create a temporary “staging” table for the logs
        * For each CSV file of interest: 
            * Open a reader for the CSV file 
                * Bulk-import the data from the CSV file into the staging table
            * Close the CSV file
        * Merge the contents of the staging table into the main storage table
    * Commit the transaction
* Disconnect from the destination database

There are only two noteworthy bits: the bulk import itself and the merge operation.

#### The Bulk Import ####

The code I use to do the import is fairly simple:

  private static void BulkImport(IDataReader reader, SqlTransaction transaction)
  {
      using (var importer = new SqlBulkCopy(transaction.Connection, SqlBulkCopyOptions.Default, transaction))
      {
          for (int field = 0; field < reader.FieldCount; field++)
          {
              var name = reader.GetName(field);
              importer.ColumnMappings.Add(name, name);
          }
   
          importer.DestinationTableName = "#w3clog_staging";
          importer.WriteToServer(reader);
      }
  }

Simple as it is, there is a lot that we can learn from this compact section of code:

* The `SqlBulkCopy` class can be given options to create an internal transaction, fire (or bypass) triggers, fire (or bypass) check constraints, insert into identity columns, and etc.
* Bulk SQL operations can enter into external transaction, and can be rolled back in the same way that any transaction can. I was expecting this, but was still pleasantly surprised to find that SQL Server inherently supports this.
* SQL Bulk Copy operations use an ordinal column mapping by default.  This means that columns are mapped based on their position in the import data and in the table rather than their names.  This can be overridden by mapping each column pair by some combination of ordinal position and column name.  Here, we are using a simple name-to-name mapping.
* Bulk operations can be performed against temp tables.  I was not expecting this to work, and was again pleasantly surprised.
* The `SqlBulkCopy` class can use either a set of DataRows (from a DataTable, for example) or an IDataReader as its source.
* ADO.NET does not have a `time` data type, it uses DateTime instead. In addition, the bulk importer does not expose any way to manually convert the columns.  Therefore, either the destination table must use `datetime` for all `time` columns, or the source reader must expose the data as `varchar`.  (It would also be possible to wrap one IDataReader with another that did the mapping, but this is more work than it is worth, in practice.)

#### The Merge Operation ####

The final notable part of the program is the merge operation.  There are several ways to get this done; from a single, complex insert statement, to individual insert operations.

We will be aiming for a set-based approach, utilizing joins to do most of the heavy lifting.

First, to delete entries that already exist in the main table, we issue a command like this:

    DELETE
        s
    FROM
        [#w3clog_staging] s
    INNER JOIN
        dbo.[w3clog] p
      ON
        s.[LogFilename] = p.[LogFilename]
      AND
        s.[LogRow] = p.[LogRow]

Simple stuff really, but to help it out, we will probably want a unique index on the main table: (this only needs to be done once)

    CREATE UNIQUE NONCLUSTERED INDEX [UK_w3clog_LogRow] ON dbo.[w3clog] 
    (
        [LogFilename] ASC,
        [LogRow] ASC
    )

Next we need to delete duplicate entries that may have crept into the staging table:

    DELETE FROM
        [#w3clog_staging]
    WHERE
        [RowId] IN
          (
            SELECT
                RowId
            FROM
              (
                SELECT
                    RowId,
                    ROW_NUMBER() OVER (PARTITION BY [LogFilename], [LogRow] ORDER BY [RowId]) [Instance]
                FROM
                    [#w3clog_staging]
              ) instances
            WHERE
                [Instance] > 1
          )

This uses the SQL Server Window Function `ROW_NUMBER()` to determine individual rows to delete.

The final action is to move the data into the main table:

  INSERT INTO
      [w3clog]
      (
          [LogFilename], [LogRow], [date], …
      )
  SELECT
      [LogFilename], [LogRow], [date], …
  FROM
      [#w3clog_staging]

Done! Now our whole import process is complete. Let’s see if we can turn this into pretty graphs…

## Analyzing the Data ##

Let’s get a simple graph showing the last 3 day’s hits, upload, and download, grouped into hourly buckets.

First, the query:

    SELECT
        DATEPART(hour, [time]),
        COUNT(*) [hits],
        SUM([sc-bytes]) [upload-bytes],
        SUM([cs-bytes]) [download-bytes]
    FROM
        dbo.[w3clog]
    WHERE
        [datetime] >= DATEADD(day, -3, GETUTCDATE())
    GROUP BY
        DATEPART(hour, [time])

Simple stuff, right?

So, here is how my server’s graph looks: (in Excel, since I’m using SQL Express on my server)

![SqlBulkCopy - 2 - Graph][8]

Can we find out what bots are hitting the site?  Sure:

    SELECT
        [cs(User-Agent)],
        COUNT(*) [hits],
        COUNT(DISTINCT [c-ip]) [ips]
    FROM
        [w3clog]
    WHERE
        [cs(User-Agent)] LIKE '%http%'
    GROUP BY
        [cs(User-Agent)]
    ORDER BY
        [hits] DESC,
        [ips] DESC

Here are my results:

<table>
  <tbody>
    <tr>
      <td>User Agent</td>
      <td>Hits</td>
      <td>Distinct IPs</td>
    </tr>

    <tr>
      <td>Mozilla/5.0+(compatible;+Yahoo!+Slurp;+http://help.yahoo.com/help/us/ysearch/slurp)</td>
      <td>71624</td>
      <td>112</td>
    </tr>

    <tr>
      <td>Mozilla/5.0+(compatible;+Googlebot/2.1;++http://www.google.com/bot.html)</td>
      <td>60536</td>
      <td>441</td>
    </tr>

    <tr>
      <td>Mozilla/5.0+(compatible;+bingbot/2.0;++http://www.bing.com/bingbot.htm)</td>
      <td>32636</td>
      <td>329</td>
    </tr>

    <tr>
      <td>Mozilla/5.0+(compatible;+Baiduspider/2.0;++http://www.baidu.com/search/spider.html)</td>
      <td>23749</td>
      <td>225</td>
    </tr>

    <tr>
      <td>Mozilla/5.0+(compatible;+YandexBot/3.0;++http://yandex.com/bots)</td>
      <td>16696</td>
      <td>7</td>
    </tr>

    <tr>
      <td>webnumbrFetcher/1.0+(http://webnumbr.com/)</td>
      <td>16551</td>
      <td>1</td>
    </tr>

    <tr>
      <td>Mozilla/5.0+(compatible;+DotBot/1.1;+http://www.dotnetdotcom.org/,+crawler@dotnetdotcom.org)</td>
      <td>14147</td>
      <td>5</td>
    </tr>

    <tr>
      <td>Mozilla/5.0+(compatible;+Yahoo!+Slurp/3.0;+http://help.yahoo.com/help/us/ysearch/slurp)</td>
      <td>13892</td>
      <td>61</td>
    </tr>

    <tr>
      <td>Baiduspider+(+http://www.baidu.com/search/spider.htm)</td>
      <td>10445</td>
      <td>550</td>
    </tr>

    <tr>
      <td>Sosospider+(+http://help.soso.com/webspider.htm)</td>
      <td>8280</td>
      <td>76</td>
    </tr>

    <tr>
      <td>Mozilla/5.0+(compatible;+SiteBot/0.1;++http://www.sitebot.org/robot/)</td>
      <td>7614</td>
      <td>5</td>
    </tr>

    <tr>
      <td>Mozilla/5.0+(compatible;+MJ12bot/v1.3.3;+http://www.majestic12.co.uk/bot.php?+)</td>
      <td>7085</td>
      <td>241</td>
    </tr>
  </tbody>
</table>

Interesting!

I have included many more queries to play with in the [project on GitHub][5].  Stay tuned for more!

[1]: http://www.google.com/analytics/
[2]: http://fwww.cacti.net/
[3]: http://www.microsoft.com/downloads/en/details.aspx?FamilyID=890cd06b-abf8-4c25-91b2-f8d975cf8c07
[4]: http://msdn.microsoft.com/en-us/library/system.data.sqlclient.sqlbulkcopy.aspx
[5]: https://github.com/otac0n/LogImporter
[6]: {{ site.url }}/blog/images/SqlBulkCopy%20-%201%20-%20WebLogs%20Connection.png "SqlBulkCopy - 1 - WebLogs Connection"
[7]: {{ site.url }}/blog/images/SqlBulkCopy%20-%202%20-%20CSV%20Connection.png "SqlBulkCopy - 2 - CSV Connection"
[8]: {{ site.url }}/blog/images/SqlBulkCopy%20-%202%20-%20Graph.png "SqlBulkCopy - 2 - Graph"
