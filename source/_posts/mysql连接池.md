---
title: mysql连接池
date: 2025-07-03 20:48:36
comments: true
tags: mysql连接池
categories: mysql连接池
updated: 2025-07-04 21:26:00
---

## 项目目的

为了提高MySQL数据库(基于C/S设计)的访问瓶颈，除了在服务端增加缓存服务器缓存常用的数据之外，还可增加连接池，来提高MySQL Server的访问效率，在高并发情况下，大量的TCP三次握手，MySQL Server连接认证，MySQL Server关闭连接回收资源和TCP四次挥手所耗费的性能时间也是很明显的，增加连接池就是为了减少这一部分的损耗。

