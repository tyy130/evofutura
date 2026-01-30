---
date: '2026-01-30T14:30:06+00:00'
draft: false
image: https://res.cloudinary.com/dg7khxdal/image/upload/v1769802707/evofutura/uploads/2026/01/self-driving-cars-drones-hijacked-by-custom-road.jpg
image_credit: 'Source: TheRegister.com'
source_name: TheRegister.com
source_url: https://www.theregister.com/2026/01/30/road_sign_hijack_ai/
title: Self-driving cars, drones hijacked by custom road signs
---

Indirect prompt injection occurs when a bot takes input data and interprets it as a command. We've seen this problem numerous times when AI bots were fed prompts via web pages or PDFs they read. Now, academics have shown that self-driving cars and autonomous drones will follow illicit instructions that have been written onto road signs.

In a new class of attack on AI systems, troublemakers can carry out these environmental indirect prompt injection attacks to hijack decision-making processes.

Potential consequences include self-driving cars proceeding through crosswalks, even if a person was crossing, or tricking drones that are programmed to follow police cars into following a different vehicle entirely.

The researchers at the University of California, Santa Cruz, and Johns Hopkins showed that, in simulated trials, AI systems and the large vision language models (LVLMs) underpinning them would reliably follow instructions if displayed on signs held up in their camera's view.

They used AI to tweak the commands displayed on the signs, such as "proceed" and "turn left," to maximize the probability of the AI system registering it as a command, and achieved success in multiple languages.

Commands in Chinese, English, Spanish, and Spanglish (a mix of Spanish and English words) all seemed to work.

As well as tweaking the prompt itself, the researchers used AI to change how the text appeared - fonts, colors, and placement of the signs were all manipulated for maximum efficacy.

The team behind it named their methods CHAI, an acronym for "command hijacking against embodied AI."

While developing CHAI, they found that the prompt itself had the biggest impact on success, but the way in which it appeared on the sign could also make or break an attack, although it is not clear why.

The researchers tested the idea of manipulating AI thinking using signs in both virtual and physical scenarios.

Of course, it would be irresponsible to see if a self-driving car would run som...

[Read the original article](https://www.theregister.com/2026/01/30/road_sign_hijack_ai/)