---
date: '2026-01-30T05:00:00'
draft: false
source_name: arXiv cs.RO
source_url: https://arxiv.org/abs/2601.21346
tags:
- cs.RO
title: 'HPTune: Hierarchical Proactive Tuning for Collision-Free Model Predictive
  Control'
---

arXiv:2601.21346v1 Announce Type: new 
Abstract: Parameter tuning is a powerful approach to enhance adaptability in model predictive control (MPC) motion planners. However, existing methods typically operate in a myopic fashion that only evaluates executed actions, leading to inefficient parameter updates due to the sparsity of failure events (e.g., obstacle nearness or collision). To cope with this issue, we propose to extend evaluation from executed to non-executed actions, yielding a hierarchical proactive tuning (HPTune) framework that combines both a fast-level tuning and a slow-level tuning. The fast one adopts risk indicators of predictive closing speed and predictive proximity distance, and the slow one leverages an extended evaluation loss for closed-loop backpropagation. Additionally, we integrate HPTune with the Doppler LiDAR that provides obstacle velocities apart from position-only measurements for enhanced motion predictions, thus facilitating the implementation of HPTune. Extensive experiments on high-fidelity simulator demonstrate that HPTune achieves efficient MPC tuning and outperforms various baseline schemes in complex environments. It is found that HPTune enables situation-tailored motion planning by formulating a safe, agile collision avoidance strategy.

[Read the original article](https://arxiv.org/abs/2601.21346)