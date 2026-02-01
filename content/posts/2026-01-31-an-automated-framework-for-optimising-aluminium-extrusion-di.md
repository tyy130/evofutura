---
date: '2026-01-31T22:26:17+00:00'
draft: false
image: https://res.cloudinary.com/dg7khxdal/image/upload/v1769933682/evofutura/uploads/2026/02/an-automated-framework-for-optimising-aluminium-ex.png
image_credit: 'Source: Springer'
source_name: Springer
source_url: https://link.springer.com/article/10.1007/s10845-025-02730-1
title: An automated framework for optimising aluminium extrusion dies using data-driven
  surrogate models - Journal of Intelligent Manufacturing
---

Development of an aluminium extrusion die optimisation tool

Feature engineering for aluminium extrusion dies involves converting geometric information from the engineering drawings or computer-aided design (CAD) models into formats compatible with ML algorithms. A widely adopted approach is direct parametrisation, where geometric dimensions are represented as a set of scalar variables (Chen et al., 2024). Alternatively, sequence-based parametrisation transforms the command sequences used in CAD modelling processes into tensors suitable for ML operations, as proposed by Wu et al. (2021). In this study, both parametrisation methods were applied to represent the geometry of extrusion dies designed for specific solid profiles. These dies are primarily defined by multiple layers of 2D sketches positioned at varying heights and the bearing length distributions, making them well-suited for sequence-based parametrisation. Concurrently, key design parameters influencing die performance were identified and selected for direct parametrisation, thereby establishing a structured mapping between design variables and performance outcomes.

Figure 1a illustrates the key components of a typical forward extrusion setup in QForm simulation: the billet, extrusion die, and backer. The extrusion die consists of the sink-in (also known as prechamber), bearing, and die relief. While each unique profile shape requires the use of a new die, the backer and other supporting tools can typically be reused across different profiles (van Ouwerkerk, 2009). Design experience has established a list of key parameters with the greatest influence on the die's ability to extrude straight profiles. These include: (i) sink-in depth (SID), (ii) profile origin to die centre (POTDC), (iii) dimensions governing the 2D sink-in profiles, and (iv) values associated with the bearing length distribution. As depicted in Fig. 1a, the SID parameter determines the distance between the sink-in's exit and entrance. Mean...

[Read the original article](https://link.springer.com/article/10.1007/s10845-025-02730-1)