---
date: '2026-01-30T21:26:18+00:00'
draft: false
image: https://res.cloudinary.com/dg7khxdal/image/upload/v1769808516/evofutura/uploads/2026/01/more-ai-security-noise-chatbots-going-rogue.jpg
image_credit: 'Source: Security Boulevard'
source_name: Security Boulevard
source_url: https://securityboulevard.com/2026/01/more-ai-security-noise-chatbots-going-rogue/
title: More AI security noise - chatbots going rogue
---

People rush to AI bots for their most sensitive tasks these days without security leading the way. The Moltbot frenzy reminds us we just wrote about this recently - the difference between AI security noise and high-impact threats.

For folks who jumped in early and got the Github project Moltbot to tie their whole userland experience together on their laptop, they just got a rude awakening. An attacker could feed it malicious prompts and it would slurp up emails you gave it access to, and send them off to an attacker - all automatically.

The appeal is to not enter your personal information on one of the big LLMs on the web, thereby controlling more sensitive information by keeping it on your computer, rather than in someone else's cloud. But when the app could be co-opted to do an attacker's bidding, security is actually worse.

By installing Moltbot (formerly Clawdbot, a subject of a name dispute) on your laptop, it aspired to create a useable, but local LLM that could do your bidding - basically optimizing a bunch of low-level, daily tasks, and just sort of "make them work together". To do this, a user had to grant access to all the resources, like email, documents, and the like (WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, etc.). But since it had access, it also had the ability to go off the rails, if maliciously directed.

MoltBot's vulnerability is not that it "went rogue," but that it operated as a privileged agent without robust trust boundaries. In effect, prompt injection became a command-and-control channel.

The bigger question: is this just training for future attacks? MoltBot may not be the real story. It may be a rehearsal.

Attackers are experimenting with how AI agents behave under manipulation, mapping permission boundaries, and learning how users configure automation tools. Today it's prompt injection. Tomorrow it's autonomous AI malware with persistence, lateral movement, and stealthy exfiltration.

The prompt injection hijinx is part...

[Read the original article](https://securityboulevard.com/2026/01/more-ai-security-noise-chatbots-going-rogue/)