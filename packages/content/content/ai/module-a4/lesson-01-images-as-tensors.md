+++
id = "ai-m4-images-as-tensors"
module = "ai-m4-computer-vision"
title = "An Image Is a Grid of Numbers"
minutes = 12
objectives = ["A4-1"]
videos = [
  { title = "How Computers See (Christian Hur)", url = "https://www.youtube.com/watch?v=nhEtYkWyTIk" },
]
diagrams = [
  { title = "One image, three channels: the tensor behind computer vision", file = "diagrams/image-tensor.svg" },
]
+++

## To a computer, an image is just numbers (A4-1)

Zoom into any photo far enough and it dissolves into a grid of tiny squares. Each square is a [pixel](https://en.wikipedia.org/wiki/Pixel), and the machine's version of that photo is nothing but a number for every square. In a [grayscale](https://en.wikipedia.org/wiki/Grayscale) image the number says how bright the pixel is — say 0 for black, 255 for white, 87 for something in between. That is the entire image as the computer receives it: a grid of numbers, one per pixel.

One grid of numbers already has a name you met in module A3's arithmetic: it is a [matrix](https://en.wikipedia.org/wiki/Matrix_(mathematics)) — rows and columns of values. Nothing about "seeing" has happened yet. The eye of the system is just a spreadsheet.

## Channels: three grids for color (A4-1)

Color adds a twist worth pausing on. Screens make every color by mixing red, green, and blue light — the [RGB color model](https://en.wikipedia.org/wiki/RGB_color_model). A color image therefore stores **three aligned grids**: one saying how much red each pixel gets, one for green, one for blue. A pixel showing pure orange is three numbers, something like (255, 165, 0) — high red, medium green, no blue.

Stack those three grids and you get a **[tensor](https://en.wikipedia.org/wiki/Tensor)**: the name for a multi-dimensional grid of numbers. A color image is a tensor of height × width × channels — for example 1080 × 1920 × 3, three numbers per pixel. When you hear that a model "takes a tensor as input," this is what arrived: the stacked grids, exactly as the camera wrote them.

![One image, three channels: the tensor behind computer vision](diagrams/image-tensor.svg)

## A worked example: counting the numbers (A4-1)

Take a small grayscale thumbnail, 100 × 100 pixels. Each pixel holds one brightness number, so the whole image is 100 × 100 = **10,000 numbers**. Now make it color: three channels per pixel — 100 × 100 × 3 = **30,000 numbers**. Now a full-HD frame, 1920 × 1080 RGB: 1920 × 1080 × 3 = 6,220,800 numbers — roughly **6.2 million numbers** for one still frame, and a camera streams dozens of those per second.

That count explains the shape of everything in this module. A model cannot sensibly read 6 million unrelated numbers one by one — so the next lesson's trick (filters that slide) exists to compress the grid into patterns. And the count is also where the tester's first CV checks live, because *how* those numbers are prepared is a pipeline decision.

## Why testers should care

Three testable consequences fall straight out of "image = tensor":

- **Preprocessing is a contract.** Models are trained on numbers in a certain range and order — 0–255 versus 0–1, RGB versus BGR channel order, specific resize dimensions. Feed raw camera data that violates the contract and the model degrades *silently*: no crash, just worse predictions. These mismatches are classic, findable defects.
- **Camera health is data health.** A mis-exposed or smeared lens shifts the grid's values before any model runs — module A2's garbage-in rule wearing a camera's face.
- **Size arithmetic is checkable.** Channels, height, width — you can verify the tensor a pipeline produces against the tensor the model expects, without any AI knowledge at all.

## In plain terms

- An image is a grid of numbers: one brightness value per pixel in grayscale.
- Color = three aligned grids (red, green, blue channels); the stack is called a tensor: height × width × channels.
- One HD color frame ≈ 6.2 million numbers — which is why models compress the grid into patterns (next lesson).
- Preprocessing (value range, channel order, resize) is a contract the pipeline must keep — a silent-failure test target.

## Check yourself

1. How many numbers does a 100 × 100 grayscale image hold, and how many does the same image hold in RGB?
2. A pixel reads (0, 0, 255) in RGB. What color do you expect to see, and why?
3. A team feeds BGR-ordered images into a model trained on RGB-ordered ones. The build passes, no crash occurs. Why is this still a serious defect?
