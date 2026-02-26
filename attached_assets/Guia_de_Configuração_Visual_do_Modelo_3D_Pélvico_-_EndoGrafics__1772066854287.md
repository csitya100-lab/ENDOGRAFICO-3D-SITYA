# Guia de Configuração Visual do Modelo 3D Pélvico - EndoGrafics Sityá

Este documento contém todas as especificações visuais (iluminação, materiais, cores, geometria, câmera) do modelo 3D pélvico para replicação em qualquer plataforma 3D (Blender, Unity, Unreal Engine, Spline, etc.).

---

## 1. Cena (Scene)

| Propriedade | Valor | Descrição |
|---|---|---|
| Background Color | `#0f172a` / RGB(15, 23, 42) | Fundo slate escuro |
| Fog Type | Exponential² | Névoa exponencial |
| Fog Color | `#0f172a` / RGB(15, 23, 42) | Mesma cor do fundo |
| Fog Density | 0.02 | Densidade baixa |

---

## 2. Câmera

| Propriedade | Valor |
|---|---|
| Tipo | Perspectiva |
| FOV (Field of View) | 45° |
| Near Clip | 0.1 |
| Far Clip | 1000 |
| Posição Inicial | X: 0, Y: 2, Z: 10 |

### Controles Orbitais

| Propriedade | Valor |
|---|---|
| Damping | Ativado |
| Damping Factor | 0.05 |
| Distância Mínima | 3 |
| Distância Máxima | 20 |
| Auto-Rotate Speed | Padrão (2.0) |

---

## 3. Renderer

| Propriedade | Valor |
|---|---|
| Antialiasing | Ativado |
| Preserve Drawing Buffer | Ativado (para capturas) |
| Pixel Ratio | window.devicePixelRatio |
| Shadow Map | Ativado |

---

## 4. Iluminação (5 fontes de luz)

### 4.1 Luz Ambiente

| Propriedade | Valor |
|---|---|
| Tipo | AmbientLight |
| Cor | `#ffffff` / Branco |
| Intensidade | 0.4 |

### 4.2 Luz Direcional Principal

| Propriedade | Valor |
|---|---|
| Tipo | DirectionalLight |
| Cor | `#ffffff` / Branco |
| Intensidade | 1.2 |
| Posição | X: 5, Y: 10, Z: 7 |
| Sombras | Ativadas |

### 4.3 Luz de Preenchimento (Fill Light)

| Propriedade | Valor |
|---|---|
| Tipo | DirectionalLight |
| Cor | `#ffffff` / Branco |
| Intensidade | 0.5 |
| Posição | X: -5, Y: 0, Z: 5 |

### 4.4 Luz Pontual Rosa (Frontal)

| Propriedade | Valor |
|---|---|
| Tipo | PointLight |
| Cor | `#ffd1dc` / Rosa suave |
| Intensidade | 0.5 |
| Distância | 20 |
| Posição | X: 0, Y: 2, Z: 5 |

### 4.5 Luz Pontual Roxa (Traseira / Rim Light)

| Propriedade | Valor |
|---|---|
| Tipo | PointLight |
| Cor | `#8b5cf6` / Roxo |
| Intensidade | 0.5 |
| Distância | 20 |
| Posição | X: 0, Y: 2, Z: -5 |

---

## 5. Materiais

### 5.1 Tecido Principal (tissueMaterial) — Útero, Tubas, Fímbrias, Canal Vaginal

| Propriedade | Valor | Descrição |
|---|---|---|
| Tipo | MeshPhysicalMaterial | Material PBR avançado |
| Color | `#d67c7c` / RGB(214, 124, 124) | Rosa/vermelho profundo |
| Roughness | 0.4 | Levemente liso |
| Metalness | 0.05 | Quase nenhum brilho metálico |
| Clearcoat | 0.1 | Verniz leve |
| Clearcoat Roughness | 0.3 | Verniz semi-fosco |
| Side | DoubleSide | Renderiza ambos os lados |

### 5.2 Ovários (ovaryMaterial)

| Propriedade | Valor | Descrição |
|---|---|---|
| Tipo | MeshPhysicalMaterial | |
| Color | `#e8dcc5` / RGB(232, 220, 197) | Bege pálido (albugínea) |
| Roughness | 0.5 | Moderadamente fosco |
| Metalness | 0.0 | Sem brilho metálico |
| Clearcoat | 0.1 | Verniz leve |

### 5.3 Intestino/Reto (intestineMaterial)

| Propriedade | Valor | Descrição |
|---|---|---|
| Tipo | MeshPhysicalMaterial | |
| Color | `#d48c8c` / RGB(212, 140, 140) | Rosa mais escuro |
| Roughness | 0.5 | Moderadamente fosco |
| Metalness | 0.0 | Sem brilho metálico |

### 5.4 Ligamentos Ovarianos (ligamentMaterial)

| Propriedade | Valor | Descrição |
|---|---|---|
| Tipo | MeshPhysicalMaterial | |
| Color | `#e08e8e` / RGB(224, 142, 142) | Rosa intermediário |
| Roughness | 0.4 | Levemente liso |
| Metalness | 0.0 | Sem brilho metálico |

### 5.5 Bexiga (bladderMaterial)

| Propriedade | Valor | Descrição |
|---|---|---|
| Tipo | MeshPhysicalMaterial | |
| Color | `#ffe6a0` / RGB(255, 230, 160) | Amarelo distinto |
| Transparent | true | |
| Opacity | 0.3 | Bastante transparente |
| Roughness | 0.1 | Bem liso |
| Metalness | 0.1 | Leve brilho |
| Transmission | 0.1 | Leve transmissão de luz |
| Thickness | 0.2 | Espessura para transmissão |

### 5.6 Ureteres (ureterMaterial)

| Propriedade | Valor | Descrição |
|---|---|---|
| Tipo | MeshPhysicalMaterial | |
| Color | `#ffeebb` / RGB(255, 238, 187) | Amarelo claro |
| Roughness | 0.3 | Liso |
| Metalness | 0.0 | Sem brilho metálico |
| Transparent | true | |
| Opacity | 0.6 | Semi-transparente |

---

## 6. Geometria e Posicionamento

### 6.1 Útero (Corpo Central)

| Propriedade | Valor |
|---|---|
| Geometria Base | SphereGeometry(raio: 1.5, segmentos: 32x32) |
| Deformação | Forma de pera: Y>0 expande X/Z em 30%; Y<0 comprime X/Z em 20% |
| Posição | X: 0, Y: 0.5, Z: 0 |
| Rotação X | 0.2 rad (~11.5°) — Leve anteversão |
| Sombras | Ativadas |

### 6.2 Ovários (Forma de Amêndoa)

| Propriedade | Esquerdo | Direito |
|---|---|---|
| Geometria Base | SphereGeometry(raio: 0.7, seg: 24x24) | Idem |
| Posição | X: -2.2, Y: 0.5, Z: 0.5 | X: 2.2, Y: 0.5, Z: 0.5 |
| Escala | X: 1.0, Y: 0.6, Z: 0.5 | Idem |
| Rotação Z | -0.5 rad (~-28.6°) | 0.5 rad (~28.6°) |

### 6.3 Tubas Uterinas (Curvas Catmull-Rom)

**Tuba Esquerda — Pontos de controle:**

| Ponto | X | Y | Z | Descrição |
|---|---|---|---|---|
| 1 | -1.0 | 1.5 | 0 | Corno uterino |
| 2 | -1.8 | 1.8 | 0.1 | Arco para cima/fora |
| 3 | -2.5 | 1.2 | 0.3 | Curva para baixo |
| 4 | -2.8 | 0.6 | 0.5 | Contorno lateral do ovário |
| 5 | -2.4 | 0.4 | 0.6 | Fímbrias (perto do ovário) |

**Tuba Direita — Espelhada (X positivo):**

| Ponto | X | Y | Z |
|---|---|---|---|
| 1 | 1.0 | 1.5 | 0 |
| 2 | 1.8 | 1.8 | 0.1 |
| 3 | 2.5 | 1.2 | 0.3 |
| 4 | 2.8 | 0.6 | 0.5 |
| 5 | 2.4 | 0.4 | 0.6 |

| Propriedade | Valor |
|---|---|
| Tipo de Tubo | TubeGeometry(segmentos: 32, raio: 0.12, radialSeg: 8) |

### 6.4 Fímbrias (Funil)

| Propriedade | Esquerda | Direita |
|---|---|---|
| Geometria | ConeGeometry(raio: 0.25, altura: 0.4, seg: 16, aberto) | Idem |
| Posição | X: -2.4, Y: 0.4, Z: 0.6 | X: 2.4, Y: 0.4, Z: 0.6 |
| Rotação Z | -1.0 rad | 1.0 rad |
| Rotação X | 0.5 rad | 0.5 rad |

### 6.5 Canal Vaginal

| Propriedade | Valor |
|---|---|
| Geometria | CylinderGeometry(raioTopo: 0.8, raioBase: 0.7, altura: 2, seg: 24) |
| Posição | X: 0, Y: -1.8, Z: 0 |
| Rotação X | 0.2 rad |

### 6.6 Intestino/Reto (Curva Posterior)

**Pontos de controle:**

| Ponto | X | Y | Z | Descrição |
|---|---|---|---|---|
| 1 | -1.5 | -2.5 | -1.5 | Início (posterior) |
| 2 | 0 | -2.2 | -1.8 | Ponto mais posterior |
| 3 | 0.5 | -0.5 | -1.5 | Subindo |
| 4 | 0 | 1.5 | -1.2 | Topo (posterior ao útero) |

| Propriedade | Valor |
|---|---|
| Tipo de Tubo | TubeGeometry(segmentos: 30, raio: 0.6, radialSeg: 16) |

### 6.7 Bexiga

| Propriedade | Valor |
|---|---|
| Geometria | SphereGeometry(raio: 1.1, seg: 32x32) |
| Posição | X: 0, Y: -1.0, Z: 1.8 (anterior ao útero) |
| Escala | X: 1.3, Y: 0.8, Z: 0.9 (achatada) |

### 6.8 Ureteres

**Ureter Esquerdo — Pontos de controle:**

| Ponto | X | Y | Z |
|---|---|---|---|
| 1 | -1.5 | 2.0 | -1.0 |
| 2 | -1.2 | 0.5 | 0.5 |
| 3 | -0.5 | -0.5 | 1.8 |

**Ureter Direito — Espelhado (X positivo):**

| Ponto | X | Y | Z |
|---|---|---|---|
| 1 | 1.5 | 2.0 | -1.0 |
| 2 | 1.2 | 0.5 | 0.5 |
| 3 | 0.5 | -0.5 | 1.8 |

| Propriedade | Valor |
|---|---|
| Tipo de Tubo | TubeGeometry(segmentos: 20, raio: 0.08, radialSeg: 8) |

### 6.9 Ligamentos Ovarianos

| Propriedade | Esquerdo | Direito |
|---|---|---|
| De | X: -1.2, Y: 0.0, Z: 0.2 | X: 1.2, Y: 0.0, Z: 0.2 |
| Até | X: -2.2, Y: 0.5, Z: 0.5 | X: 2.2, Y: 0.5, Z: 0.5 |
| Tipo de Tubo | TubeGeometry(seg: 4, raio: 0.08, radialSeg: 8) | Idem |

---

## 7. Labels (Rótulos)

| Propriedade | Valor |
|---|---|
| Tipo | Sprite (sempre virado para câmera) |
| Fonte | bold 32px Arial |
| Cor do Texto | Branco |
| Contorno | Preto, largura: 4px |
| Fundo | Transparente |
| Escala | X: 2, Y: 0.5, Z: 1 |
| Visibilidade Padrão | Oculto (visível apenas no modo explodido) |

| Label | Posição |
|---|---|
| Útero | X: 0, Y: 2.5, Z: 0 |
| Ovário Esq. | X: -2.5, Y: 1.5, Z: 0.5 |
| Ovário Dir. | X: 2.5, Y: 1.5, Z: 0.5 |
| Intestino | X: 0, Y: -1.5, Z: -2.0 |
| Bexiga | X: 0, Y: -0.5, Z: 2.0 |

---

## 8. Modo Explodido (Separação de Camadas)

| Estrutura | Posição Normal | Posição Explodida |
|---|---|---|
| Bexiga | X: 0, Y: -1.0, Z: 1.8 | Z: 4.0, Y: -1.5 (avança para frente) |
| Intestino | Posição da geometria | Z: -2.0, Y: -3.0 (recua para trás) |

---

## 9. Planos de Anotação (Overlays 2D no 3D)

| Plano | Orientação | Posição | Rotação |
|---|---|---|---|
| Frontal | Face para câmera (XY) | X: 0, Y: 0, Z: 0.1 | Nenhuma |
| Sagital | Face lateral (YZ) | X: 0.1, Y: 0, Z: 0 | Y: 90° (π/2) |
| Coronal | Face superior (XZ) | X: 0, Y: 0.1, Z: 0 | X: 90° (π/2) |

| Propriedade | Valor |
|---|---|
| Tamanho | 6 x 6 unidades |
| Material | MeshBasicMaterial, transparente, opacidade: 0.8 |
| Depth Test | Desativado |

---

## 10. Prompt para Replicar em Outra Plataforma

Use o seguinte prompt em ferramentas de IA 3D ou como briefing para modeladores:

> **Prompt:**
>
> Crie um modelo 3D anatômico da pelve feminina para uso médico-educacional em ginecologia e endometriose. O modelo deve incluir:
>
> **Estruturas anatômicas:**
> - Útero central em forma de pera (esfera deformada, rosa-avermelhado #d67c7c), com leve anteversão (~11°)
> - Dois ovários laterais em forma de amêndoa (bege pálido #e8dcc5), inclinados em direção ao útero
> - Tubas uterinas sinuosas conectando os cornos uterinos aos ovários, com fímbrias em forma de funil nas extremidades
> - Ligamentos ovarianos finos conectando ovários ao útero
> - Canal vaginal cilíndrico abaixo do útero
> - Bexiga semi-transparente (amarelo #ffe6a0, opacidade 30%) posicionada anteriormente ao útero
> - Ureteres semi-transparentes (amarelo claro #ffeebb, opacidade 60%) conectando-se à bexiga
> - Intestino/reto (rosa escuro #d48c8c) posicionado posteriormente ao útero
>
> **Materiais e aparência:**
> - Todos os tecidos devem usar materiais PBR (Physical Based Rendering)
> - Superfícies orgânicas com roughness 0.4-0.5, metalness próximo a 0
> - Leve clearcoat (0.1) para aparência úmida/orgânica
> - Bexiga com transmissão de luz e alta transparência
>
> **Iluminação:**
> - Luz ambiente branca suave (intensidade 0.4)
> - Luz direcional principal branca (intensidade 1.2) vindo de cima-direita-frente
> - Luz de preenchimento branca (intensidade 0.5) vindo da esquerda
> - Luz pontual rosa suave (#ffd1dc, intensidade 0.5) frontal para tom orgânico
> - Rim light roxa (#8b5cf6, intensidade 0.5) traseira para destaque de contorno
>
> **Fundo:** Slate escuro (#0f172a) com névoa exponencial sutil (densidade 0.02)
>
> **Estilo visual:** Médico-educacional, realista mas estilizado, com cores que diferenciam claramente cada estrutura anatômica. Adequado para mapeamento de endometriose e consultas ginecológicas.

---

## 11. Paleta de Cores Resumida

| Cor Hex | RGB | Uso |
|---|---|---|
| `#0f172a` | (15, 23, 42) | Fundo da cena |
| `#d67c7c` | (214, 124, 124) | Tecido principal (útero, tubas, canal) |
| `#e8dcc5` | (232, 220, 197) | Ovários |
| `#d48c8c` | (212, 140, 140) | Intestino/reto |
| `#e08e8e` | (224, 142, 142) | Ligamentos |
| `#ffe6a0` | (255, 230, 160) | Bexiga |
| `#ffeebb` | (255, 238, 187) | Ureteres |
| `#ffd1dc` | (255, 209, 220) | Luz rosa frontal |
| `#8b5cf6` | (139, 92, 246) | Rim light roxa |

---

*Documento gerado automaticamente a partir do código-fonte do EndoGrafics Sityá — Viewer3D.tsx*
