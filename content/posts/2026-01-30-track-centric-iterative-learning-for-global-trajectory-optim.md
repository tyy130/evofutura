---
date: '2026-01-30T05:00:00'
draft: false
source_name: arXiv cs.RO
source_url: https://arxiv.org/abs/2601.21027
title: Track-centric Iterative Learning for Global Trajectory Optimization in Autonomous
  Racing
tags:
  - cs.RO
  - products
---

arXiv:2601.21027v1 Announce Type: new 
Abstract: This paper presents a global trajectory optimization framework for minimizing lap time in autonomous racing under uncertain vehicle dynamics. Optimizing the trajectory over the full racing horizon is computationally expensive, and tracking such a trajectory in the real world hardly assures global optimality due to uncertain dynamics. Yet, existing work mostly focuses on dynamics learning at the tracking level, without updating the trajectory itself to account for the learned dynamics. To address these challenges, we propose a track-centric approach that directly learns and optimizes the full-horizon trajectory. We first represent trajectories through a track-agnostic parametric space in light of the wavelet transform. This space is then efficiently explored using Bayesian optimization, where the lap time of each candidate is evaluated by running simulations with the learned dynamics. This optimization is embedded in an iterative learning framework, where the optimized trajectory is deployed to collect real-world data for updating the dynamics, progressively refining the trajectory over the iterations. The effectiveness of the proposed framework is validated through simulations and real-world experiments, demonstrating lap time improvement of up to 20.7% over a nominal baseline and consistently outperforming state-of-the-art methods.

[Read the original article](https://arxiv.org/abs/2601.21027)