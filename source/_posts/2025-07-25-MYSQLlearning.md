---
title: MYSQL learning
date: 2025-07-25 15:46:07
tags: MYSQL learning
urlname: MYSQL learning
categories: MYSQL learning
updated: 2025-07-25 21:26:16
---

## MySQL基础

### MySQL介绍

1. 关系型数据库(**有行有列**) **SQLite(进程内的db)**  NOSQL(**非关系数据库)键值对**（key-value）:redis leveldb rocksdb 大数据分析列式数据库 Hbase
2. 大家熟悉的关系型数据库还有SQL Server,Oracle,MySQL,MariaDB,DB2
3. MySQL区别于其他关系型数据库最大的一个特点就是**支持插件式的存储引擎**，支持如**InnoDB,MyISAM,Memory**等
4. MySQL设计成**C/S模型**
5. MySQL的服务器模型采用的是**I/O复用+可伸缩的线程池**，是实现网络服务器的经典模型。用的是**select+线程池。**这里为什么不设计成epoll+线程池，或者更高效的模型，**用select,因为网络I/O快，但是MySQL还需要把数据存储到磁盘，磁盘I/O速度是比较慢的，所以速度匹配即可，没必要做那么快**。

![1](1.png)

**Windows下MySQL安装目录中有一个my.ini文件，可以做一些配置调优。在data文件夹中，每建立一个数据库会有一个文件夹与其对应。**

**Linux下mysql的配置文件 /etc/my.cnf，没有可以自己创建**

```bash
#在root用户下
netstat -tanp #查看mysql是否启动,这个命令主要显示当前系统的所有 TCP 连接及其状态，并显示对应的进程信息。
service mysql start #启动mysql
```

### MySQL数据类型

**MySQL数据类型定义了数据的大小范围，因此使用时选择合适的类型，不仅会降低表占用的磁盘空间，间接减少了磁盘I/O的次数，提高了表的访问效率，而且索引的效率也和数据的类型息息相关。**

#### **整数类型（Integer Types）**

| 类型               | 大小（字节） | 范围（有符号）                                          | 范围（无符号）                  | 描述           |
| ------------------ | ------------ | ------------------------------------------------------- | ------------------------------- | -------------- |
| `TINYINT`          | 1            | -128 到 127                                             | 0 到 255                        | 很小的整数     |
| `SMALLINT`         | 2            | -32,768 到 32,767                                       | 0 到 65,535                     | 小整数         |
| `MEDIUMINT`        | 3            | -8,388,608 到 8,388,607                                 | 0 到 16,777,215                 | 中等大小的整数 |
| `INT` 或 `INTEGER` | 4            | -2,147,483,648 到 2,147,483,647                         | 0 到 4,294,967,295              | 常用整数类型   |
| `BIGINT`           | 8            | -9,223,372,036,854,775,808 到 9,223,372,036,854,775,807 | 0 到 18,446,744,073,709,551,615 | 大整数         |

可加上 `UNSIGNED` 修饰符来存储更大的非负整数

age INT(9)：整型占用内存的大小是固定的，和具体的类型是强相关的。(M)只是代表整数显示的宽度

####  **浮点与定点类型（Floating-Point and Fixed-Point Types）**

**推荐DECIMAL,FLOAT和DOUBLE数据越界不会报错，DECIMAL会报错**

| 类型                             | 描述         | 范围和精度                                      |
| -------------------------------- | ------------ | ----------------------------------------------- |
| `FLOAT(M,D)`                     | 单精度浮点数 | 近似值，4字节，M是总位数，D是小数位数 7位精度   |
| `DOUBLE(M,D)` 或 `REAL(M,D)`     | 双精度浮点数 | 近似值，8字节，M是总位数，D是小数位数  15位精度 |
| `DECIMAL(M,D)` 或 `NUMERIC(M,D)` | 定点数       | 精确值，适合存储货币等对精度要求高的场景        |

- `M`: 精度（总位数），`D`: 小数位数
- `DECIMAL` 使用字符串进行存储，防止浮点误差
- 如果 `M` 和 `D` 不指定，MySQL 默认为 `DECIMAL(10,0)`

#### **字符型类型**

| 类型         | 最大长度                              | 是否定长 | 是否可设默认值 | 特点说明                            | 典型用途                 |
| ------------ | ------------------------------------- | -------- | -------------- | ----------------------------------- | ------------------------ |
| `CHAR(M)`    | 最多 255 字符                         | ✅        | ✅              | 固定长度，右侧自动补空格            | 固定长度：手机号、身份证 |
| `VARCHAR(M)` | 取决于字符集（如 utf8mb4 最多 21844） | ❌        | ✅              | 变长字符串，节省空间，需额外1-2字节 | 姓名、标题、备注         |
| `TINYTEXT`   | 255 字节                              | ❌        | ❌              | 极短文本，不能设默认值              | 简短评论、小段文字       |
| `TEXT`       | 64 KB                                 | ❌        | ❌              | 常用文本类型，不能设默认值          | 文章正文、用户简介       |
| `MEDIUMTEXT` | 16 MB                                 | ❌        | ❌              | 中大型文本                          | 博文、报告内容           |
| `LONGTEXT`   | 4 GB                                  | ❌        | ❌              | 超大文本                            | 大文档、日志             |

| 类型           | 最大长度        | 特点说明                             | 用途举例               |
| -------------- | --------------- | ------------------------------------ | ---------------------- |
| `BINARY(M)`    | 最多 255 字节   | 类似 `CHAR`，存储二进制数据，定长    | 加密哈希、固定密钥存储 |
| `VARBINARY(M)` | 最多 65535 字节 | 类似 `VARCHAR`，变长二进制字符串     | 二进制令牌、签名       |
| `TINYBLOB`     | 255 字节        | 与 `TINYTEXT` 类似，但用于二进制数据 | 小图标、缩略图         |
| `BLOB`         | 64 KB           | 与 `TEXT` 类似，用于二进制内容       | 图像、音频、文件       |
| `MEDIUMBLOB`   | 16 MB           | 中等大小二进制对象                   | 视频、音频中等资源     |
| `LONGBLOB`     | 4 GB            | 超大二进制对象                       | 文件存储、大附件       |

#### **日期和时间类型**

| 类型        | 占用空间 | 范围/格式                                          | 精度   | 用途示例           |
| ----------- | -------- | -------------------------------------------------- | ------ | ------------------ |
| `DATE`      | 3 字节   | `1000-01-01` 到 `9999-12-31`                       | 到“日” | 出生日期、订单日期 |
| `TIME`      | 3 字节   | `-838:59:59` 到 `838:59:59`                        | 到“秒” | 持续时间、工时     |
| `DATETIME`  | 8 字节   | `1000-01-01 00:00:00` 到 `9999-12-31 23:59:59`     | 到“秒” | 记录某一精确时刻   |
| `TIMESTAMP` | 4 字节   | `1970-01-01 00:00:01` UTC 到 `2038-01-19 03:14:07` | 到“秒” | 创建时间、修改时间 |
| `YEAR`      | 1 字节   | `1901` 到 `2155`                                   | 到“年” | 出厂年份、学年     |

#### 枚举与集合类型（可存储预定义字符串）

| 类型        | 特点说明                                                | 示例用途                                      |
| ----------- | ------------------------------------------------------- | --------------------------------------------- |
| `ENUM(...)` | 从固定字符串列表中选一个值，实际存储为整数索引（1字节） | 性别、状态（如 `'男','女'`、`'启用','禁用'`） |
| `SET(...)`  | 可多选，存储为位图（1~8字节），最多支持 64 个选项       | 标签、用户权限、兴趣爱好                      |

### MySQL运算符

#### 算数运算符

| 运算符 | 含义         | 示例                 | 结果  |
| ------ | ------------ | -------------------- | ----- |
| `+`    | 加法         | `5 + 3`              | `8`   |
| `-`    | 减法         | `5 - 3`              | `2`   |
| `*`    | 乘法         | `5 * 3`              | `15`  |
| `/`    | 除法         | `5 / 2`              | `2.5` |
| `DIV`  | 整除         | `5 DIV 2`            | `2`   |
| `%`    | 取模（余数） | `5 % 2` 或 `5 MOD 2` | `1`   |
| `MOD`  | 同 `%`       | `5 MOD 3`            | `2`   |

#### 逻辑运算符

| 运算符 | 名称            | 示例                        | 说明                           |
| ------ | --------------- | --------------------------- | ------------------------------ |
| `AND`  | 逻辑与          | `age > 18 AND gender = 'M'` | 两个条件都为真，结果才为真     |
| `OR`   | 逻辑或          | `score > 90 OR grade = 'A'` | 至少一个条件为真，结果为真     |
| `NOT`  | 逻辑非          | `NOT (age < 18)`            | 取反，原来为真变为假，反之亦然 |
| `XOR`  | 逻辑异或        | `TRUE XOR FALSE`            | 仅当两个值不同，结果才为真     |
| `!`    | 逻辑非（简写）  | `!is_deleted`               | 等价于 `NOT is_deleted`        |
| `&&`   | 与（MySQL兼容） | `a > 5 && b < 10`           | 等价于 `AND`                   |
| `||`   | 逻辑或          |                             |                                |

#### 比较运算符

| 运算符                    | 含义                  | 示例                              | 结果                      |
| ------------------------- | --------------------- | --------------------------------- | ------------------------- |
| `=`                       | 等于                  | `age = 18`                        | `true` 或 `false`         |
| `!=` 或 `<>`              | 不等于                | `name != 'Tom'`                   | `true` 或 `false`         |
| `>`                       | 大于                  | `score > 60`                      | `true` 或 `false`         |
| `<`                       | 小于                  | `score < 60`                      | `true` 或 `false`         |
| `>=`                      | 大于等于              | `score >= 90`                     | `true` 或 `false`         |
| `<=`                      | 小于等于              | `score <= 100`                    | `true` 或 `false`         |
| `<=>`                     | 安全等于（支持 NULL） | `a <=> NULL`                      | `true` if both NULL       |
| `IS NULL`                 | 判断是否为 NULL       | `birthday IS NULL`                | `true` 或 `false`         |
| `IS NOT NULL`             | 非 NULL               | `email IS NOT NULL`               | `true` 或 `false`         |
| `BETWEEN ... AND ...`     | 在区间内              | `score BETWEEN 60 AND 90`         | 含头尾：`60 ≤ score ≤ 90` |
| `NOT BETWEEN ... AND ...` | 不在区间              | `age NOT BETWEEN 18 AND 25`       | `true` 或 `false`         |
| `IN (...)`                | 属于集合              | `city IN ('Beijing', 'Shanghai')` | 是否存在于集合中          |
| `NOT IN (...)`            | 不属于集合            | `status NOT IN ('A', 'B')`        | `true` 或 `false`         |
| `LIKE`                    | 模糊匹配（单行）      | `name LIKE 'J%'`                  | `J`开头的字符串           |
| `NOT LIKE`                | 非匹配                | `email NOT LIKE '%.com'`          | 不以`.com`结尾            |
| `REGEXP` 或 `RLIKE`       | 正则匹配              | `name REGEXP '^A.*'`              | 匹配正则表达式            |

### MySQL常用函数

| 分类         | 函数名                                | 功能描述                        | 示例                                             | 示例结果                |
| ------------ | ------------------------------------- | ------------------------------- | ------------------------------------------------ | ----------------------- |
| 字符串函数   | `CONCAT(str1, str2, ...)`             | 字符串连接                      | `CONCAT('Hello', 'World')`                       | `'HelloWorld'`          |
|              | `LENGTH(str)`                         | 字节长度（utf8中一个汉字3字节） | `LENGTH('abc')`                                  | `3`                     |
|              | `CHAR_LENGTH(str)`                    | 字符长度（汉字算1个字符）       | `CHAR_LENGTH('你好')`                            | `2`                     |
|              | `UPPER(str)`                          | 转大写                          | `UPPER('abc')`                                   | `'ABC'`                 |
|              | `LOWER(str)`                          | 转小写                          | `LOWER('ABC')`                                   | `'abc'`                 |
|              | `REPLACE(str, from_str, to_str)`      | 字符串替换                      | `REPLACE('abcabc', 'a', 'x')`                    | `'xbcxbc'`              |
|              | `SUBSTRING(str, pos, len)`            | 截取字符串                      | `SUBSTRING('abcdef', 2, 3)`                      | `'bcd'`                 |
|              | `TRIM(str)`                           | 去除字符串首尾空格              | `TRIM('  abc ')`                                 | `'abc'`                 |
| 数值函数     | `ABS(n)`                              | 绝对值                          | `ABS(-10)`                                       | `10`                    |
|              | `ROUND(n, d)`                         | 四舍五入到小数点后 d 位         | `ROUND(3.14159, 2)`                              | `3.14`                  |
|              | `CEIL(n)`                             | 向上取整                        | `CEIL(2.3)`                                      | `3`                     |
|              | `FLOOR(n)`                            | 向下取整                        | `FLOOR(2.7)`                                     | `2`                     |
|              | `MOD(a, b)`                           | 取模                            | `MOD(10, 3)`                                     | `1`                     |
|              | `RAND()`                              | 生成0到1之间随机数              | `RAND()`                                         | `0.123456789`（示例）   |
|              | `TRUNCATE(n, d)`                      | 截断数字到小数点后 d 位         | `TRUNCATE(3.4567, 2)`                            | `3.45`                  |
| 日期时间函数 | `NOW()`                               | 当前日期时间                    | `NOW()`                                          | `'2025-07-25 20:30:00'` |
|              | `CURDATE()`                           | 当前日期                        | `CURDATE()`                                      | `'2025-07-25'`          |
|              | `CURTIME()`                           | 当前时间                        | `CURTIME()`                                      | `'20:30:00'`            |
|              | `DATE_FORMAT(date, fmt)`              | 格式化日期                      | `DATE_FORMAT(NOW(), '%Y-%m-%d')`                 | `'2025-07-25'`          |
|              | `DATEDIFF(a, b)`                      | 计算日期差（a - b）天数         | `DATEDIFF('2025-08-01', '2025-07-25')`           | `7`                     |
|              | `TIMESTAMPDIFF(unit, a, b)`           | 计算两时间差，单位可选          | `TIMESTAMPDIFF(DAY, '2025-07-25', '2025-08-01')` | `7`                     |
|              | `ADDDATE(date, n)`                    | 日期加n天                       | `ADDDATE('2025-07-25', 5)`                       | `'2025-07-30'`          |
|              | `SUBDATE(date, n)`                    | 日期减n天                       | `SUBDATE('2025-07-25', 5)`                       | `'2025-07-20'`          |
| 聚合函数     | `COUNT(*)`                            | 统计行数                        | `SELECT COUNT(*) FROM users`                     | `100`                   |
|              | `SUM(col)`                            | 求和                            | `SUM(price)`                                     | `12345.67`              |
|              | `AVG(col)`                            | 平均值                          | `AVG(score)`                                     | `87.5`                  |
|              | `MAX(col)`                            | 最大值                          | `MAX(age)`                                       | `60`                    |
|              | `MIN(col)`                            | 最小值                          | `MIN(created_at)`                                | `'2020-01-01'`          |
| 条件判断函数 | `IF(expr, a, b)`                      | 条件判断，类似三元运算符        | `IF(score > 60, '及格', '不及格')`               | `'及格'`                |
|              | `IFNULL(expr, val)`                   | 如果 expr 为 NULL，返回 val     | `IFNULL(name, '未知')`                           | `'未知'`                |
|              | `NULLIF(a, b)`                        | 若 a = b，则返回 NULL，否则 a   | `NULLIF(1,1)` → `NULL`                           | `NULL`                  |
|              | `CASE WHEN ... THEN ... ELSE ... END` | 多条件判断                      | 参见下方示例                                     |                         |

### MySQL完整性约束

#### 主键约束

**primary key**(**唯一且不为空**)

#### 自增键约束

**auto_increment(整型自增)**

#### 唯一键约束

**unique(不可以重复但是可以为空)**

#### 非空约束

**not null**

#### 默认值约束

**default**

#### 外键约束

**foreign key** 

```mysql
CREATE TABLE USER(
id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '用户的主键id',
nickname varchar(50) UNIQUE NOT NULL COMMENT '用户的昵称',
age TINYINT UNSIGNED NOT NULL DEFAULT 18,
sex ENUM('male','female'));
```

```mysql
+----------+-----------------------+------+-----+---------+----------------+
| Field    | Type                  | Null | Key | Default | Extra          |
+----------+-----------------------+------+-----+---------+----------------+
| id       | int unsigned          | NO   | PRI | NULL    | auto_increment |
| nickname | varchar(50)           | NO   | UNI | NULL    |                |
| age      | tinyint unsigned      | NO   |     | 18      |                |
| sex      | enum('male','female') | YES  |     | NULL    |                |
+----------+-----------------------+------+-----+---------+----------------+
4 rows in set (0.03 sec)
```

### 关系型数据库表设计

好的设计减少数据冗余。

#### 一对一关系

**在子表中增加一列，关联父表的主键**

```mysql
用户User表：父表
uid 	name 	age		sex
1000	zhang	20		M
1020	liu		21 		W
2010 	Wang	22		M
身份信息Info 子表
uid 	cardid		addrinfo
1020    112233		aaa
2010    334455		bbb
1000	556677		ccc
```

#### 一对多

**在子表中增加一列，关联父表的主键**

```mysql
电商系统：
用户User,商品Product,订单Order
用户和商品：没有关系
用户和订单：一对多的关系 User为父表 Order为子表 在子表中增加一列，关联父表的主键
商品和订单：多对多的关系
User: 
uid 	name 	age		sex
1000	zhang	20		M
1020	liu		21 		W
2010 	Wang	22		M
Product:
pid		pname	price	amount
1		手机		600		100
2		笔记本		2000	50
3		电池		10		200
Order:
orderid		uid		pid		number		money	totalprice	addrinfo
O1000		1000	1		1			600		4640		海定区
O1000		1000	2		2			4000	4640		海定区
O1000		1000	3		5			40		4640		海定区
O2000		2010	2		1			2000	2000		平谷区
```

#### 多对多

**增加一个中间表**

```mysql
电商系统：
用户User,商品Product,订单Order
用户和商品：没有关系
用户和订单：一对多的关系 User为父表 Order为子表 在子表中增加一列，关联父表的主键
商品和订单：多对多的关系 
User: 
uid 	name 	age		sex
1000	zhang	20		M
1020	liu		21 		W
2010 	Wang	22		M
Product:
pid		pname	price	amount
1		手机		600		100
2		笔记本		2000	50
3		电池		10		200
Order:
orderid		uid		pid		number		money	totalprice	addrinfo
O1000		1000	1		1			600		4640		海定区
O1000		1000	2		2			4000	4640		海定区
O1000		1000	3		5			40		4640		海定区
O2000		2010	2		1			2000	2000		平谷区
商品和订单：多对多的关系 
发现Order表太过冗余了，所以增加一个中间表
订单内容表
OrderList:
orderid		pid		number	money
O1000		1		1		600
O1000		2		2		4000
O1000		3		4		40
O2000  		2		1		2000
这里中间表可以orderid,pid为联合主键。
所以Order表改变
Order:
orderid		uid		totalprice	addrinfo
O1000		1000		4640		海定区
O2000		2010		2000		平谷区
```

### 关系型数据库范式

**应用数据库范式可以带来许多好处，最重要的到处归结为三点：**

1. **减少数据冗余(这是最主要的好处，其他好处都是由此而附带的)**
2. **消除异常(插入异常，更新异常，删除异常)**
3. **让数据组织的更加和谐**

**但是数据库范式绝对不是越高越好，范式越高，意味着表越多，多表联合查询的机率就越大，SQL的效率就越低。**

#### 第一范式（1NF）

**每一列保持原子特性**

列都是基本数据项，不能够再进行分割，否则设计成一对多的实体关系。例如表中的地址字段，可以再细分为省，市，区等不可再分割的字段。**不符合第一范式不能称作关系型数据库。**

#### 第二范式（2NF）

**属性完全依赖于主键，主要针对联合主键**

非主属性完全依赖于主关键字，如果不是完全依赖主键，应该拆分成新的实体，设计成一对多的实体关系。

例如：选课关系表为SelectCourse(学号，姓名，年龄，课程名称，成绩，学分),(学号，课程名称)是联合主键，但是学分字段只和课程名称有关，和学号无关，相当于只依赖联合主键的其中一个字段，不符合第二范式。姓名，年龄不符合第二范式

```mysql
所以这里需要拆分
学生表
学号		姓名		年龄

课程表
课程id	课程名称	学分

中间表：选课情况
学号 课程id 成绩
```

#### 第三范式（3NF）

**属性不依赖于其他非主属性**

示例：学生关系表为Student(学号，姓名，年龄，所在学院，学院地点，学院电话)，学号是主键，但是学院电话只依赖于所在学院，并不依赖于主键学号，所以不符合第三范式，应该把学院专门设计成一张表，学生表和学院表，两个是一对多的关系。

**一般关系型数据库满足第三范式就可以了。**

#### BC范式（BCNF）

**每个表中只有一个候选键**

#### 第四范式（4NF）

**消除表中的多值依赖**

## MySQL核心SQL

### 结构化查询语句SQL

SQL是结构化查询语言，它是关系型数据库的通用语言。

SQL主要可以划分三个类别：

1. DDL语句：数据定义语言，这些语句定义了不同的数据库，表，列，索引等数据库对象的定义。通常的语句关键字主要包括**create,drop,alter**等。
2. DML语句：数据操纵语句，用于添加，删除，更新和查询数据库记录，并检查数据完整性，常用的语句关键字主要包括**insert,delete,update和select**等。
3. DCL语句：数据控制语句，用于控制不同的许可和访问级别的语句。这些语句定义了数据库，表，字段，用户的访问权限和安全级别。主要的语句关键字包括**grant,revoke**等。

### 库操作

```mysql
#查询数据库
show databases;
#创建数据库
create database ChatDB;
#删除数据库
drop database ChatDB;
#选择数据库
use ChatDB;
```

### 表操作

查看表

```mysql
show tables;
```

创建表

```mysql
create table user(
    id int unsigned primary key not null auto_increment,
    name varchar(50) unique not null,
    age tinyint not null,
    sex enum('M','W') not null)engine=INNODB default charset=utf8;
```

查看表结构

```mysql
desc user;
```

查看建表sql

```mysql
show create table user\G
```

删除表

```mysql
drop table user;
```

### CRUD操作

#### insert增加

```mysql
insert into user(nickname,name,age,sex) values('fixbug','zhangsan',22,'M');
insert into user(nickname,name,age,sex) values('666','li si',21,'W'),('888','gao yang',20,'M');
```

**这里有个问题：就是一次全插入和多次插入最后结果都是相同的，那么他们有什么区别。**

![2](2.png)

**由上图，多次插入会导致tcp连接次数增多，消耗资源。**

#### update修改

```mysql
update user set age=23 where name='zhangsan';
update user set age=age+1 where id=3;
```

#### delete删除

```mysql
delete from user where age=23;
delete from user where age between 20 and 22;
delete from user;
```

#### select查询

```mysql
select * from user;
select id,nickname,name,age,sex from user;
select id,name from user;
select id,nickname,name,age,sex from user where sex='M' and age>=20 and age<=25;
select id,nickname,name,age,sex from user where sex='M' and age between 20 and 25;
select id,nickname,name,age,sex from user where sex='W' or age>=22;
```

**去重distinct**

```mysql
select distinct name from user;
```

**空值查询**

**is [not] null**

```mysql
select * from user where name is null;
```

**union合并查询**

**把两个结果合并起来，union默认去重，不用修饰distinct，all表示显示所有重复值。**

```mysql
select country from websites union all select country from apps order by country;
```

**带in子查询**

**[不]包含这些元素**

**[not] in(元素1，元素2，...，元素3)**

```mysql
select * from user where id in(10,20,30,40,50);
select * from user where id not in(10,20,30,40,50);
select * from user where id in(select stu_id from grade where average>=60.0);
```

**分页查询**

```mysql
select id,nickname,name,age,sex from user limit 10;
select id,nickname,name,age,sex from user limit 2000,10#偏移2000，再取10个
```

```mysql
explain select * from user where name='zhangsan';
explain:查看SQL语句的执行计划(但是MySQL的自身优化检测不到，可能体现的数据不对)，主键会注册主键索引，唯一键会注册索引，通过索引查询，直接查到（查一次），不需要遍历去查。如果通过没有注册索引的字段去查询的话，就可能变成整表查询（查很多次）。
```

```mysql
select id,nickname,name,age,sex from user limit 10;#没有设计limit 10，它是查完整表返回结果，设计了limit 10 查到10个符合条件的数据就返回。
所以这就可以利用这个特性
在通过一些非注册索引的字段查找时，可以通过limit,提高查询速度。
select * from t_user where email ='1000001@fixbug.com';
+---------+--------------------+----------+
| id      | email              | password |
+---------+--------------------+----------+
| 1000001 | 1000001@fixbug.com | 1000001  |
+---------+--------------------+----------+
1 row in set (0.66 sec)

mysql> select * from t_user where email ='1000001@fixbug.com' limit 1;
+---------+--------------------+----------+
| id      | email              | password |
+---------+--------------------+----------+
| 1000001 | 1000001@fixbug.com | 1000001  |
+---------+--------------------+----------+
1 row in set (0.33 sec)
```

```mysql
分页查询优化
select * from t_user limit 1000000,20;
+---------+--------------------+----------+
| id      | email              | password |
+---------+--------------------+----------+
| 1000001 | 1000001@fixbug.com | 1000001  |
| 1000002 | 1000002@fixbug.com | 1000002  |
| 1000003 | 1000003@fixbug.com | 1000003  |
| 1000004 | 1000004@fixbug.com | 1000004  |
| 1000005 | 1000005@fixbug.com | 1000005  |
| 1000006 | 1000006@fixbug.com | 1000006  |
| 1000007 | 1000007@fixbug.com | 1000007  |
| 1000008 | 1000008@fixbug.com | 1000008  |
| 1000009 | 1000009@fixbug.com | 1000009  |
| 1000010 | 1000010@fixbug.com | 1000010  |
| 1000011 | 1000011@fixbug.com | 1000011  |
| 1000012 | 1000012@fixbug.com | 1000012  |
| 1000013 | 1000013@fixbug.com | 1000013  |
| 1000014 | 1000014@fixbug.com | 1000014  |
| 1000015 | 1000015@fixbug.com | 1000015  |
| 1000016 | 1000016@fixbug.com | 1000016  |
| 1000017 | 1000017@fixbug.com | 1000017  |
| 1000018 | 1000018@fixbug.com | 1000018  |
| 1000019 | 1000019@fixbug.com | 1000019  |
| 1000020 | 1000020@fixbug.com | 1000020  |
+---------+--------------------+----------+
20 rows in set (0.27 sec)
select * from t_user where id>1000000 limit 20;
+---------+--------------------+----------+
| id      | email              | password |
+---------+--------------------+----------+
| 1000001 | 1000001@fixbug.com | 1000001  |
| 1000002 | 1000002@fixbug.com | 1000002  |
| 1000003 | 1000003@fixbug.com | 1000003  |
| 1000004 | 1000004@fixbug.com | 1000004  |
| 1000005 | 1000005@fixbug.com | 1000005  |
| 1000006 | 1000006@fixbug.com | 1000006  |
| 1000007 | 1000007@fixbug.com | 1000007  |
| 1000008 | 1000008@fixbug.com | 1000008  |
| 1000009 | 1000009@fixbug.com | 1000009  |
| 1000010 | 1000010@fixbug.com | 1000010  |
| 1000011 | 1000011@fixbug.com | 1000011  |
| 1000012 | 1000012@fixbug.com | 1000012  |
| 1000013 | 1000013@fixbug.com | 1000013  |
| 1000014 | 1000014@fixbug.com | 1000014  |
| 1000015 | 1000015@fixbug.com | 1000015  |
| 1000016 | 1000016@fixbug.com | 1000016  |
| 1000017 | 1000017@fixbug.com | 1000017  |
| 1000018 | 1000018@fixbug.com | 1000018  |
| 1000019 | 1000019@fixbug.com | 1000019  |
| 1000020 | 1000020@fixbug.com | 1000020  |
+---------+--------------------+----------+
20 rows in set (0.00 sec)
可以看出明显的效率不同
select * from t_user limit 1000000,20;通过limit偏移，是会扫表的，所以耗费效率，所以我们要通过有索引的字段来约束条件，他就不会扫前面的，因为索引。这样效率也提高了
select * from t_user where id>1000000 limit 20;id>的取值一般为上一页最后一条数据的id值
```

**排序order by**

```mysql
select id,nickname,name,age,sex from user where sex='M' and age>=20 and age<=25 order by age asc;(默认为升序)
select id,nickname,name,age,sex from user where sex='M' and age>=20 and age<=25 order by age desc;(降序)
select id,nickname,name,age,sex from user where sex='M' and age>=20 and age<=25 order by name,age asc;(先按name升序，当name相同时，再按age升序)
```

**分组group by**

```mysql
select sex from user group by sex;
select count(id) as number,sex from user group by sex;
select count(id),age from user group by age having age>20;
select age,sex,count(*) from user group by age,sex;
```

**group by后面再筛选就不能用where,要使用having。**

**在使用 ORDER BY 和 GROUP BY 时，建议对相关字段建立索引。**

**如果排序或分组字段没有索引，MySQL 在执行过程中通常会采用 filesort 或创建临时表，这会导致性能下降。通过 EXPLAIN 分析语句时，可以在 Extra 字段看到 Using filesort，这意味着：**

- **MySQL 首先会读取满足条件的数据；**
- **将其加载到内存或临时表中；**
- **然后在内存或磁盘上进行排序；**
- **最终返回排序后的结果。**

**由于这涉及额外的 CPU 和磁盘 I/O 操作，效率会显著降低，尤其是在数据量较大时。因此，在 ORDER BY 或 GROUP BY 中应尽量使用已经建立索引的字段，以提升查询性能。**

### 连接查询

![3](E:\Desktop\boke\source\_posts\2025-07-25-MYSQLlearning\3.png)

#### 内连接查询

```mysql
#on a.uid=c.uid 区分大表和小表，按照（where过滤后）数据量来区分，小表永远是整表扫描，然后去大表搜索。所以大表建索引才是最有效的
#从student小表中取出所有的a.uid，然后拿着这些uid去exame大表搜素。
#对于inner join内连接，过滤条件写在where的后面和on连接条件里面(会优化成where去过滤)，效果一样的。
select a.uid,a.name,a.age,a.sex,c.score from student a 
inner join exame c 
on a.uid=c.uid 
where c.uid=1 and c.cid=2;

select a.uid,a.name,a.age,a.sex,b.cid,b.cname,b.credit,c.score from exame c
inner join student a on c.uid=a.uid
inner join course b on c.cid=b.cid
where c.uid=1 and c.cid=2;
```

**内连接查询解决单张表的limit分页偏移量的消耗，这个问题可以采用有索引的字段来约束条件来使分页偏移量的消耗消失。**

```mysql
select * from t_user where id>1000000 limit 20;
```

**可是如果我们不知道这个id的值要取多少，偏移量必须写。又该如何提升效率。可以利用临时表存储所需信息的id，再通过这张表和原表inner join进而查出更多的信息。**

```mysql
select id,email,password from t_user limit 1500000,10;
+---------+--------------------+----------+
| id      | email              | password |
+---------+--------------------+----------+
| 1500001 | 1500001@fixbug.com | 1500001  |
| 1500002 | 1500002@fixbug.com | 1500002  |
| 1500003 | 1500003@fixbug.com | 1500003  |
| 1500004 | 1500004@fixbug.com | 1500004  |
| 1500005 | 1500005@fixbug.com | 1500005  |
| 1500006 | 1500006@fixbug.com | 1500006  |
| 1500007 | 1500007@fixbug.com | 1500007  |
| 1500008 | 1500008@fixbug.com | 1500008  |
| 1500009 | 1500009@fixbug.com | 1500009  |
| 1500010 | 1500010@fixbug.com | 1500010  |
+---------+--------------------+----------+
10 rows in set (0.71 sec)
这是正常查的
select id from t_user limit 1500000,10;
+---------+
| id      |
+---------+
| 1500001 |
| 1500002 |
| 1500003 |
| 1500004 |
| 1500005 |
| 1500006 |
| 1500007 |
| 1500008 |
| 1500009 |
| 1500010 |
+---------+
10 rows in set (0.20 sec)
#我们发现查单个字段效率会提高
#所以我们建立临时表（小表）存储带索引的字段，再通过inner join查出相同的结果
select a.id,a.email,a.password from t_user a inner join (select id from t_user limit 1500000,10) b on a.id=b.id;
+---------+--------------------+----------+
| id      | email              | password |
+---------+--------------------+----------+
| 1500001 | 1500001@fixbug.com | 1500001  |
| 1500002 | 1500002@fixbug.com | 1500002  |
| 1500003 | 1500003@fixbug.com | 1500003  |
| 1500004 | 1500004@fixbug.com | 1500004  |
| 1500005 | 1500005@fixbug.com | 1500005  |
| 1500006 | 1500006@fixbug.com | 1500006  |
| 1500007 | 1500007@fixbug.com | 1500007  |
| 1500008 | 1500008@fixbug.com | 1500008  |
| 1500009 | 1500009@fixbug.com | 1500009  |
| 1500010 | 1500010@fixbug.com | 1500010  |
+---------+--------------------+----------+
10 rows in set (0.18 sec)
#肉眼可见的效率提高了。
```

#### 外连接查询

**左连接查询**

```mysql
#把left这边的表所有的数据显示出来，在右表中不存在相应数据，则显示NULL，这里就不存在大小表的区分了，左表整表扫描。
select a.* from User a left join orderlist b on a.uid=b.uid where a.orderid is null;
```

**右连接查询**

```mysql
#把right这边的表所有的数据显示出来，在左表中不存在相应数据，则显示NULL，这里就不存在大小表的区分了，右表整表扫描。
select a.* from User a right join orderlist b on a.uid=b.uid where b.orderid is null;
```

```mysql
#外连接经常用于查找某个用户没有，不存在
#查找没有考试的学生
select * from student where uid not in (select distinct uid from exame);
#select distinct uid from exame 会产生一张中间表存储结果供外面的sql来查询
#not in对于索引的命中并不高
#可以看出用上述方法效率不是很高
select a.* from student a left join exame b on a.uid=b.uid where b.cid is null;
#这样也可以实现效果
```

```mysql
select a.* from student a left join exame b on a.uid=b.uid where b.cid=3;
select a.* from student a inner join exame b on a.uid=b.uid where b.cid=3;
#上述两句效果是一样的，为什么呢，这时候我们用explain查看左连接，先查b表，再查a表，这就和左连接的查表顺序不符，和内连接相符。
#原因在于where筛选数据后b为小表，所以又成了内连接了。所以在外连接查找时，where不要跟具体的筛选，放在on后，where后跟判断null.
select a.* from student a left join exame b on a.uid=b.uid and b.cid=3 where b.cid is null;
#带有一定条件的查询某个用户没有做什么要像上述写的。
```

## MySQL存储引擎

```bash
一张表，MySQL一般如何存储
表的结构，数据，索引
存储引擎直接影响上面内容的存储方式
```

**MyISAM不支持事务，也不支持外键，索引采用非聚集索引，其优势是访问的速度快，对事务完整性没有要求，以select,insert为主的应用基本上都可以使用这个引擎来创建表。MyISAM的表在磁盘上存储三个文件，其文件名都和表名相同，扩展名分别是：**

**.frm(存储表定义)**

**.MYD(MYData，存储数据)**

**.MYI(MYIndex，存储索引)**

**InnoDB存储引擎提供了具有提交，回滚和崩溃恢复能力的事务安全，支持自动增长列，外键等功能，索引采用聚集索引，索引和数据存储在同一个文件，所以InnoDB的表在磁盘上有两个文件，其文件名都和表名相同，扩展名分别是：**

**.frm(存储表定义)**

**.ibd(存储数据和索引)**

**MEMORY存储引擎使用存在内存中的内容创建表。每个MEMORY表实际只对应一个磁盘文件，格式是.frm(表结构定义)。MEMORY类型的表访问非常快，因为它的数据是放在内存中的，并且默认使用HASH索引（不适合做范围查询），但是一旦服务关闭，表中的数据就会丢失掉。**

### 各存储引擎区别

### MySQL 存储引擎对比

| 特性/存储引擎 | **InnoDB**                                                 | **MyISAM**                                     | **Memory**                                     |
| ------------- | ---------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| 🔒 锁机制      | ✅ 行级锁 + 表级锁混合（默认行锁，支持多版本并发控制 MVCC） | ❌ 仅支持表级锁，写入或更新时整个表被锁定       | ❌ 仅支持表级锁                                 |
| 🌳 B-树索引    | ✅ 支持，**聚簇索引（主键）**存储数据，辅助索引存主键       | ✅ 支持，**非聚簇索引**，索引与数据分离         | ✅ 支持（基于哈希或 B-Tree，可设置）            |
| 🔗 哈希索引    | ⚠️ 不支持（只有 Adaptive Hash Index，InnoDB 内部使用）      | ❌ 不支持                                       | ✅ 默认使用哈希索引，**也支持 BTree（可配置）** |
| 🔐 外键支持    | ✅ 支持（定义级联删除、更新等外键约束）                     | ❌ 不支持                                       | ❌ 不支持                                       |
| 🔁 事务支持    | ✅ 支持完整事务（ACID），回滚、提交、一致性恢复             | ❌ 不支持事务机制                               | ❌ 不支持事务                                   |
| 📚 索引缓存    | ✅ 支持（通过 Buffer Pool 缓存索引和数据）                  | ✅ 支持（**只缓存索引，不缓存数据**）           | ❌ 不缓存索引（数据在内存中，系统重启即失）     |
| 💾 数据缓存    | ✅ 支持（Buffer Pool 中同时缓存数据和索引）                 | ❌ 不支持数据缓存（每次查询都需从磁盘读取数据） | ✅ 所有数据在内存中，速度极快                   |

**锁机制：表示数据库在并发请求访问的时候，多个事务在操作时，并发操作的粒度。**

**B-树索引和哈希索引：主要是加速SQL的查询速度。**

**外键：子表的字段依赖父表的主键，设置两张表的依赖关系。**

**事务：多个SQL语句，保证他们共同执行的原子操作，要么成功，要么失败，不能只成功一部分，失败需回滚事务。**

**索引缓存和数据缓存：和MySQL Server的查询缓存相关，在没有对数据和索引做修改之前，重复查询可以不用进行磁盘I/O(数据库的性能提升，目的是为了减少磁盘I/O操作来提升数据库访问效率)，读取上一次内存中查询的缓存即可。**