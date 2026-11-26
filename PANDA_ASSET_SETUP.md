# KIDUVA Panda Mascots: Image Asset Setup

The storefront now includes ten approved KIDUVA panda characters in a responsive family section, plus decorative placements in the hero, newsletter, footer, and empty cart.

## One asset required
Upload the accompanying `kiduva-pandas.webp` file to **public/kiduva-pandas.webp** in this GitHub repository (`main` branch), then wait for Vercel's production deployment.

GitHub direct upload: https://github.com/shifad107/kiduva/upload/main/public

This is one optimized transparent 5-column × 2-row image sprite. The ten pictures are in these positions:

| Row | Position | Mascot |
| --- | --- | --- |
| 1 | 1 | Girl shopping |
| 1 | 2 | Girl peek-a-boo |
| 1 | 3 | Girl holding heart |
| 1 | 4 | Girl sleeping |
| 1 | 5 | Girl waving |
| 2 | 1 | Boy shopping |
| 2 | 2 | Boy peek-a-boo |
| 2 | 3 | Boy holding heart |
| 2 | 4 | Boy sleeping |
| 2 | 5 | Boy waving |

The storefront uses `background-size: 500% 200%` to show each picture separately. The source artwork is not part of product photos. Nothing has been changed in the commerce/payment backend.

If the sprite is not yet uploaded, a small emoji fallback may show in panda positions. Do not rename the file.
