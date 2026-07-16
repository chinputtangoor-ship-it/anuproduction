# Official Defect List — ANU Production

> Source: owner (`defect.txt`) · Version: 1.0 · 2026-07-16  
> ใช้ใน **Box Grade** เมื่อ grade ไม่อยู่ใน `STATUSES_WITHOUT_DEFECT` (`AF`, `HP`, `HUP`)

เมื่อ implement Phase 2 ให้ sync ค่านี้ไปที่ `lib/constants/production.ts` (`DEFECT_LIST`) แทนรายการเก่า

```
Hole
Foreign Capsul
Uncut Cap
Uncut Body
Loose Ring Inside
Loose Ring Outside
Rapid Dried
Telescope
String on End
Double Dip
Tripping
Spiral Cut
Dent Cap
Dent Body
Chipped Cap
Chipped Body
Folded Cap
Loose Cap
Loose Body
Double Cap
Collet Pinch
Locked
Rough Edge
Uneven Cut
Scratch
Oil Ring
Side Corrugation
Star End
Bubble
Black Spot
Color Spot
Double Dome
Dirty
Mini Cap
Mini Body
Long Cap
Long Body
Unprint
Stranger
Incomplette Message
Broken Print
Non-Oriented Capsules
Illigible print
Wrong Color Ink
Soiled
Multiple Print
Ink Speck
Smudged Ink
Ink Line
Displaced Print
Light Print
Dark Print
Minor Skewing
Big Skewing
```

**หมายเหตุ:** เก็บสะกดตามที่โรงงานใช้จริง (รวมคำที่สะกดไม่มาตรฐาน) เพื่อให้ตรงป้าย/รายงานเดิม — อย่าแก้สะกดในโค้ดโดยไม่ขอ owner
