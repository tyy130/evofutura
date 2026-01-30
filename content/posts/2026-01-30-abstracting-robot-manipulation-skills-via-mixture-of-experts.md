---
date: '2026-01-30T05:00:00'
draft: false
source_name: arXiv cs.RO
source_url: https://arxiv.org/abs/2601.21251
title: Abstracting Robot Manipulation Skills via Mixture-of-Experts Diffusion Policies
tags:
  - cs.RO
  - industry
---

arXiv:2601.21251v1 Announce Type: new 
Abstract: Diffusion-based policies have recently shown strong results in robot manipulation, but their extension to multi-task scenarios is hindered by the high cost of scaling model size and demonstrations. We introduce Skill Mixture-of-Experts Policy (SMP), a diffusion-based mixture-of-experts policy that learns a compact orthogonal skill basis and uses sticky routing to compose actions from a small, task-relevant subset of experts at each step. A variational training objective supports this design, and adaptive expert activation at inference yields fast sampling without oversized backbones. We validate SMP in simulation and on a real dual-arm platform with multi-task learning and transfer learning tasks, where SMP achieves higher success rates and markedly lower inference cost than large diffusion baselines. These results indicate a practical path toward scalable, transferable multi-task manipulation: learn reusable skills once, activate only what is needed, and adapt quickly when tasks change.

[Read the original article](https://arxiv.org/abs/2601.21251)