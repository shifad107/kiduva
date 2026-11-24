#!/usr/bin/env python3
"""Create a real transparent PNG from the OFFICIAL KIDUVA logo without redrawing it."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[1]
source=root/'public/kiduva-logo.png'
target=root/'public/kiduva-logo-transparent.png'
original=Image.open(source).convert('RGBA')
pixels=np.asarray(original)
rgb=pixels[:,:,:3]
hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
# Original logo's pale-gold border: include light yellow hues to trace the actual outline.
gold=cv2.inRange(hsv,np.array([10,40,60],np.uint8),np.array([40,255,255],np.uint8))
gold=cv2.morphologyEx(gold,cv2.MORPH_CLOSE,np.ones((13,13),np.uint8))
contours,_=cv2.findContours(gold,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
if not contours: raise RuntimeError('Gold cloud outline not found')
cloud=max(contours,key=cv2.contourArea)
if cv2.contourArea(cloud)<0.4*rgb.shape[0]*rgb.shape[1]:
    raise RuntimeError('Unexpected logo geometry; refusing to alter')
mask=np.zeros(gold.shape,np.uint8)
cv2.drawContours(mask,[cloud],-1,255,thickness=cv2.FILLED,lineType=cv2.LINE_AA)
# Subpixel edge smoothing. Art inside the cloud is copied pixel-for-pixel.
mask=cv2.GaussianBlur(mask,(3,3),0.55)
pixels=pixels.copy()
pixels[:,:,3]=mask
Image.fromarray(pixels,'RGBA').save(target,optimize=True)
print('Saved',target,Image.open(target).getbbox())

app=root/'src/App.tsx'
text=app.read_text()
text=text.replace('src="/kiduva-logo.png"','src="/kiduva-logo-transparent.png"')
app.write_text(text)

style=root/'src/styles.css'
style.write_text(style.read_text()+"""
/* Official transparent PNG replaces all old approximate SVG/poly clipping. */
footer .footer-brand-lockup .official-logo,
.admin .side-official-logo {
  -webkit-mask-image:none!important;
  mask-image:none!important;
  clip-path:none!important;
  background:transparent!important;
  border:0!important;
  border-radius:0!important;
  box-shadow:none!important;
  padding:0!important;
}
""")
