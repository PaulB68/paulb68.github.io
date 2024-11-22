


// import piexif from "./node_modules/piexifjs/piexif.js";  
// import require from  "./addRequire.js";
// const piexif = require("./node_modules/piexifjs/piexifs");
// import * as piexif from "./node_modules/piexifjs/piexif.js";
// import {that} from "./node_modules/piexifjs/piexif.js";

const canvas = document.getElementById("myCanvas");
const cropCanvas = document.getElementById("cropCanvas");
const ctx = canvas.getContext("2d");
let cropCtx;


// let width = (canvas.width = window.innerWidth * 0.90);
// let height = (canvas.height = window.innerHeight * 0.90);

let parent = document.getElementById('stack');
let width = parent.clientWidth;
let height = parent.clientHeight;

canvas.width = width;
canvas.height = height;
cropCanvas.width = width;
cropCanvas.height = height;

let gridInfo = document.getElementById("gridInfo");
gridInfo.innerText = `Canvas Size: ${width} x ${height}`

const img = new Image();
let imageBitmap;
let currentFileName = '';
let originalWidth = 0;
let originalHeight = 0;
let offscreenCanvas;
let ratio  = 1.0;
let centerShift_x = 0;
let centerShift_y = 0;
let gridRows = 1;
let numSquares = 2;
let gridLineThickness = 2.0;

let cropOffsetX = 0;
let cropOffsetY = 0;

let cropRectangleWidth = 0;
let cropRectangleHeight = 0;
let cropVisible = false;

let cropWidthRatio = 0.75; 
let cropAspectRatio = 1.5;
let cropHeightRatio = cropWidthRatio / cropAspectRatio;
let confineToAR = true;

let cropOffsetXRatio = 1.0;
let cropOffsetYRatio = 1.0;

let cropRectangle = {
  left : 0.0,
  right : 0.0,
  top : 0.0,
  bottom : 0.0
};

const MovementTypes = Object.freeze({ 
  NW: 0,
  NE: 1,
  SW: 2,
  SE: 3,
  North : 4,
  South: 5,
  West: 6,
  East: 7,
  Whole: 8,
  None: 9
});

let currentMovement = MovementTypes.None;
const tolerance = 10;

let exifObj;
let piexifAvailable = false;

img.onload = async () => {
    let hRatio = canvas.width  / img.naturalWidth    ;
    let vRatio =  canvas.height / img.naturalHeight  ;
    ratio  = Math.min ( hRatio, vRatio );
    centerShift_x = ( canvas.width - img.width*ratio ) / 2;
    centerShift_y = ( canvas.height - img.height*ratio ) / 2;  
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.drawImage(img, 0,0, img.naturalWidth, img.naturalHeight,
                      centerShift_x,centerShift_y,img.width*ratio, img.height*ratio);

    cropCanvas.style.left = `${centerShift_x}`+ 'px';
    cropCanvas.style.top = `${centerShift_y}` + 'px';
    cropCanvas.width = img.width*ratio;
    cropCanvas.height = img.height*ratio;

    imageBitmap = await createImageBitmap(img);
    originalWidth = imageBitmap.width;
    originalHeight = imageBitmap.height;

    const imageInfoLabel = document.getElementById("imageInfo");
    imageInfoLabel.innerText = `${currentFileName}: ${originalWidth}x${originalHeight}`;
}
    
  
async function redraw() {
  
  if (imageBitmap ==null) {
    return;
  }
  let hRatio = canvas.width  / imageBitmap.width    ;
  let vRatio =  canvas.height / imageBitmap.height  ;
  let ratio  = Math.min ( hRatio, vRatio );
  let centerShift_x = ( canvas.width - imageBitmap.width*ratio ) / 2;
  let centerShift_y = ( canvas.height - imageBitmap.height*ratio ) / 2;  
  ctx.clearRect(0,0,canvas.width, canvas.height);
  ctx.drawImage(imageBitmap, 0,0, imageBitmap.width, imageBitmap.height,
                    centerShift_x,centerShift_y,imageBitmap.width*ratio, imageBitmap.height*ratio);
  
  cropCanvas.style.left = `${centerShift_x}`+ 'px';
  cropCanvas.style.top = `${centerShift_y}` + 'px';
  cropCanvas.width = imageBitmap.width*ratio;
  cropCanvas.height = imageBitmap.height*ratio;

  if (offscreenCanvas == null) {
    return;
  }             
  try {
    const gridImage = await createImageBitmap(offscreenCanvas, 0, 0, imageBitmap.width, imageBitmap.height);
    ctx.drawImage(gridImage, 0, 0, imageBitmap.width, imageBitmap.height,
        centerShift_x, centerShift_y, imageBitmap.width*ratio, imageBitmap.height*ratio );
  }
  catch(e) {
    if (!(e instanceof Error)) {
      e = new Error(e);
    }
    alert(e.message);
  }
}

async function redrawCrop() {
  if (!cropVisible) {
    return;
  }
  cropRectangleWidth = cropCanvas.width * cropWidthRatio;
  cropRectangleHeight = cropCanvas.height * cropHeightRatio;
  cropOffsetX = cropCanvas.width / cropOffsetXRatio;
  cropOffsetY = cropCanvas.height / cropOffsetYRatio;

  cropCtx.strokeStyle = "rgb(255 255 255)";
  cropCtx.lineWidth = 2.0;
  cropCtx.strokeRect(cropOffsetX, cropOffsetY, cropRectangleWidth, cropRectangleHeight);

}


// img.src = "p1050588.jpg";

addEventListener("resize", (event) => {
  width = (canvas.width = parent.clientWidth);
  height = (canvas.height = parent.clientHeight);
  cropCanvas.width = width;
  cropCanvas.height = height;
  redraw();
  if (cropVisible) {
    redrawCrop();
  }
});

async function updateImageDisplay() {
  let files = nonFilePicker.files;
  // let file = files[0];
  currentFileName = files[0].name;
  // let objUrl = URL.createObjectURL(files[0]);
  img.src = URL.createObjectURL(files[0]);
  const blob = await files[0].arrayBuffer();
  piexifAvailable = (globalThis.piexif !== null);
  if (piexifAvailable) {
    var base64 = btoa(
      new Uint8Array(blob)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    let base64Encoded = "data:image/jpeg;base64," + base64;
    exifObj = globalThis.piexif.load(base64Encoded);
    for (var ifd in exifObj) {
        if (ifd == "thumbnail") {
            continue;
        }
        console.log("-" + ifd);
        // alert("-" + ifd);
        for (var tag in exifObj[ifd]) {
            console.log("  " + globalThis.piexif.TAGS[ifd][tag]["name"] + ":" + exifObj[ifd][tag]);
        }
    }
    let tags = globalThis.piexif.TAGS['0th'];
    
    let [makeTag, val] = Object.entries(tags).find(([key, value]) => {if (value.name === 'Make') {
                                                                        return true;}
                                                                      });

    let [modelTag, val2] = Object.entries(tags).find(([key, value]) => {if (value.name === 'Model') {
                                                                        return true;}
    });
    let exifInfo = '';

    if (makeTag) {
      exifInfo += `Make: ${exifObj['0th'][makeTag]}\n`;
    }
    if (modelTag) {
      exifInfo += `Model: ${exifObj['0th'][modelTag]}\n`;
    }
    alert(exifInfo);
  }
}

function bytesToBase64(bytes) {
  const binString = Array.from(bytes, (byte) =>
    String.fromCodePoint(byte),
  ).join("");
  return btoa(binString);
}

function addKeywordStringToExif(newKeyword) {
  if (!piexifAvailable) {
    return false;
  }
  let tags = globalThis.piexif.TAGS['0th'];
  let [xpKeywordsTag, val3] = Object.entries(tags).find(([key, value]) => {if (value.name === 'XPKeywords') {
    return true;}
  });

  if (xpKeywordsTag) {
    let byteArray = exifObj['0th'][xpKeywordsTag];
    // let strValue = '';
    let newArray = [];
    if (byteArray && byteArray.length > 0) {
      newKeyword = '; ' + newKeyword;
    }
    for (let i=0; i<newKeyword.length; i++) {
      newArray.push( newKeyword.charCodeAt(i), 0);
    }
    
    if (byteArray && byteArray.length > 0) {
      byteArray = byteArray.concat(newArray); 
    } 
    else {
      byteArray = newArray;
    }
    exifObj['0th'][xpKeywordsTag] = byteArray;  
    return true;
  }
  return false;
}

async function getImageBitmapFromFileHandle(fileHandle) {
  // Get the file from the file handle
  const file = await fileHandle.getFile();
  currentFileName = file.name;
  
  // Create a Blob from the file
  const blob = await file.arrayBuffer();
  
  // Create an ImageBitmap from the Blob
  const imageBitmap = await createImageBitmap(new Blob([blob]));

  originalWidth = imageBitmap.width;
  originalHeight = imageBitmap.height;

  const imageInfoLabel = document.getElementById("imageInfo");
  imageInfoLabel.innerText = `${currentFileName}: ${originalWidth}x${originalHeight}`;
  // imageInfoLabel.innerText = 'New Text';

  if (piexifAvailable) {
    var base64 = btoa(
      new Uint8Array(blob)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    let base64Encoded = "data:image/jpeg;base64," + base64;
    exifObj = globalThis.piexif.load(base64Encoded);
    for (var ifd in exifObj) {
        if (ifd == "thumbnail") {
            continue;
        }
        console.log("-" + ifd);
        // alert("-" + ifd);
        for (var tag in exifObj[ifd]) {
            console.log("  " + globalThis.piexif.TAGS[ifd][tag]["name"] + ":" + exifObj[ifd][tag]);
        }
    }
    let tags = globalThis.piexif.TAGS['0th'];
    
    let [makeTag, val] = Object.entries(tags).find(([key, value]) => {if (value.name === 'Make') {
                                                                        return true;}
                                                                      });

    let [modelTag, val2] = Object.entries(tags).find(([key, value]) => {if (value.name === 'Model') {
                                                                        return true;}
    });

    let [xpKeywordsTag, val3] = Object.entries(tags).find(([key, value]) => {if (value.name === 'XPKeywords') {
      return true;}
    });

    let exifInfo = '';

    if (makeTag) {
      exifInfo += `Make: ${exifObj['0th'][makeTag]}\n`;
    }
    if (modelTag) {
      exifInfo += `Model: ${exifObj['0th'][modelTag]}\n`;
    }

    if (xpKeywordsTag) {
      let byteArray = exifObj['0th'][xpKeywordsTag];
      let strValue = '';
      if (byteArray && byteArray.length > 0) {
        for (let i=0; i < byteArray.length-1; i+= 2) {
          strValue += byteArray[i] > 0 ? String.fromCodePoint(byteArray[i]) : '';
        } 
      }   
      exifInfo += `Keywords: ${strValue}\n`;
    }
    alert(exifInfo);
  }
  return imageBitmap;
}


let nonFilePicker = document.getElementById("nonFilePicker");
nonFilePicker.addEventListener("change", updateImageDisplay);


async function verifyPermission(fileHandle, readWrite) {
  const options = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  // Check if permission was already granted. If so, return true.
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  // Request permission. If the user grants permission, return true.
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  // The user didn't grant permission, so return false.
  return false;
}

//const nonFilePicker = document.getElementById("nonFilePicker");
const button = document.getElementById("openButton");

button.addEventListener("click", async (event) => {
  if (!globalThis.piexif) {
    // alert("piefix not in window");
  }
  else {
    // alert("piefix available");
    piexifAvailable = true;
  }
  let filePickerAvailable = false;
  if ('showOpenFilePicker' in window) {
    filePickerAvailable = true;
  }
  
  if (filePickerAvailable) {
    const fileHandle = await window.showOpenFilePicker({
      startIn: 'pictures'
    });
    imageBitmap = await getImageBitmapFromFileHandle(fileHandle[0]);
  
  

    let hRatio = canvas.width  / imageBitmap.width;
    let vRatio =  canvas.height / imageBitmap.height;
    ratio  = Math.min ( hRatio, vRatio );
    centerShift_x = ( canvas.width - imageBitmap.width*ratio ) / 2;
    centerShift_y = ( canvas.height - imageBitmap.height*ratio ) / 2; 
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.drawImage(imageBitmap, 0, 0, imageBitmap.width, imageBitmap.height,
          centerShift_x, centerShift_y, imageBitmap.width*ratio, imageBitmap.height*ratio);

    cropCanvas.style.left = `${centerShift_x}`+ 'px';
    cropCanvas.style.top = `${centerShift_y}` + 'px';
    cropCanvas.width = imageBitmap.width*ratio;
    cropCanvas.height = imageBitmap.height*ratio;
  }
  else {
    // alert("File Picker not available");
    if (nonFilePicker) {
      nonFilePicker.click();
      return null;
    }
  } 
});

function getAllHorizontals(startY, endY, midY, numLines)
{
  const allYs = [];

  if (numLines <= 0)
  {
      return allYs;
  }

  numSquares = numLines + 1;
  let squareSize = Math.round(Math.round(endY - startY) / numSquares);
  let seemsRight = false;
  while (!seemsRight)
  {
      let yLine = midY - squareSize;
      while (yLine >= startY)
      {
          allYs.push(yLine);
          yLine -= squareSize;
      }
      yLine = midY + squareSize;
      while (yLine <= endY)
      {
          allYs.push(yLine);
          yLine += squareSize;
      }
      if (allYs.length > numLines - 1)
      {
          squareSize += 1;
          allYs.length = 0;
      }
      else if (allYs.length < numLines - 1)
      {
          squareSize -= 1;
          allYs.length = 0;
      }
      else
      {
          seemsRight = true;
          allYs.push(midY);
          allYs.sort(function(a, b) {
            return a - b;
            }); // sorts the array in ascending numerical order
          }
  }
  return allYs;

}

function getAllVerticals(startX, endX, midX, squareSize)
{
  const allXs = [];
  
  if (squareSize <= 0)
  {
      return allXs;
  }

  let xLine = midX - squareSize;
  while (xLine > 0 && xLine >= startX)
  {
      allXs.push(xLine);
      xLine -= squareSize;
  }
  xLine = midX + squareSize;
  while (xLine < endX)
  {
      allXs.push(xLine);
      xLine += squareSize;
  }
  allXs.push(midX);
  allXs.sort(function(a, b) {
    return a - b;
    }); // sorts the array in ascending numerical order
  
  if (allXs.length > 0)
  {
      if (allXs[0] < 0)
      {
          allXs.splice(0, 1);
      }
  }
  if (allXs.length > 0)
  {
      if (allXs[allXs.length - 1] > endX)
      {
          allXs.splice(allXs.length - 1, 1);
      }
  }
  return allXs;

}

const gridButton = document.getElementById("gridButton");

gridButton.addEventListener("click", async (event) => {
  
  // ctx.beginPath();
  // ctx.moveTo(centerShift_x, centerShift_y + (imageBitmap.height*ratio) / 2);
  // ctx.lineTo(centerShift_x + imageBitmap.width*ratio, centerShift_y + (imageBitmap.height*ratio) / 2);
  // ctx.stroke();

  offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const octx = offscreenCanvas.getContext("2d");

  const allHorizontals = getAllHorizontals(0, imageBitmap.height, Math.round(imageBitmap.height / 2), gridRows);
  // alert (allHorizontals);
  const squareSize = allHorizontals.length >= 2 ?  allHorizontals[1] - allHorizontals[0] : imageBitmap.width / 2;
  const allVerticals = getAllVerticals(0, imageBitmap.width, Math.round(imageBitmap.width / 2), squareSize);
  // alert(allVerticals);

  octx.lineWidth = gridLineThickness;
  octx.drawImage(imageBitmap, 0, 0);
  octx.beginPath();
  // octx.moveTo(0, imageBitmap.height / 2);
  // octx.lineTo(imageBitmap.width, imageBitmap.height / 2);
  // octx.moveTo(imageBitmap.width/2, 0);
  // octx.lineTo(imageBitmap.width/2, imageBitmap.height);

  for (let x = 0; x < allVerticals.length; x++ ) {
    octx.moveTo(allVerticals[x], 0);
    octx.lineTo(allVerticals[x], imageBitmap.height);
  }
  for (let y = 0; y < allHorizontals.length; y++ ) {
    octx.moveTo(0, allHorizontals[y]);
    octx.lineTo(imageBitmap.width, allHorizontals[y]);
  }
  octx.stroke();

  try {
    const gridImage = await createImageBitmap(offscreenCanvas, 0, 0, imageBitmap.width, imageBitmap.height);
    ctx.drawImage(gridImage, 0, 0, imageBitmap.width, imageBitmap.height,
        centerShift_x, centerShift_y, imageBitmap.width*ratio, imageBitmap.height*ratio );
  }
  catch(e) {
    if (!(e instanceof Error)) {
      e = new Error(e);
    }
    alert(e.message);
  }

});

async function displayCroppedImage()
{
  let newCropWidth = 0.0;
  let newCropHeight = 0.0;
  let bitmapCropOffsetX = 0;
  let bitmapCropOffsetY = 0;

  // Translate back to the bitmap units
  newCropWidth = cropRectangleWidth / ratio;
  newCropHeight = cropRectangleHeight / ratio;

  bitmapCropOffsetX = cropOffsetX /ratio;
  bitmapCropOffsetY = cropOffsetY /ratio;

  ctx.clearRect(0,0,canvas.width, canvas.height);
  
  try {
    const croppedImage = await createImageBitmap(imageBitmap, bitmapCropOffsetX, bitmapCropOffsetY, newCropWidth, newCropHeight);
    let hRatio = canvas.width  / croppedImage.width;
    let vRatio =  canvas.height / croppedImage.height;
    ratio  = Math.min ( hRatio, vRatio );
    centerShift_x = ( canvas.width - croppedImage.width*ratio ) / 2;
    centerShift_y = ( canvas.height - croppedImage.height*ratio ) / 2; 
    ctx.drawImage(croppedImage, 0, 0, croppedImage.width, croppedImage.height,
        centerShift_x, centerShift_y, croppedImage.width*ratio, croppedImage.height*ratio );
    offscreenCanvas = new OffscreenCanvas(croppedImage.width, croppedImage.height);
    const octx = offscreenCanvas.getContext("2d");
    octx.drawImage(croppedImage, 0, 0, croppedImage.width, croppedImage.height);
  }
  catch(e) {
    if (!(e instanceof Error)) {
      e = new Error(e);
    }
    alert(e.message);
  }
  // offscreenCanvas = new OffscreenCanvas(croppedImage.width, croppedImage.height);
  // const octx = offscreenCanvas.getContext("2d");
  // octx.drawImage(croppedImage, 0, 0, croppedImage.width, croppedImage.height);

}

cropButton.addEventListener("click", async (event) => {

  if (cropVisible) {
    await displayCroppedImage();
    cropVisible = false;
    return;
  }
  
  cropCtx = cropCanvas.getContext("2d");
  cropCtx.strokeStyle = "rgb(255 255 255)";
  cropCtx.lineWidth = 2.0;

  cropRectangleWidth = cropCanvas.width * cropWidthRatio;
  cropRectangleHeight = cropRectangleWidth / cropAspectRatio;
  cropHeightRatio = cropRectangleHeight / cropCanvas.height;
  if (cropRectangleHeight > cropCanvas.height) {
    cropRectangleHeight = cropCanvas.height;
    cropRectangleWidth = cropRectangleHeight * cropAspectRatio;
    cropWidthRatio = cropRectangleWidth / cropCanvas.width;
    cropHeightRatio = cropRectangleHeight / cropCanvas.height;
  }
  
  cropOffsetX = (cropCanvas.width - cropRectangleWidth) / 2;
  cropOffsetY = (cropCanvas.height - cropRectangleHeight) / 2;

  cropCtx.strokeRect(cropOffsetX, cropOffsetY, cropRectangleWidth, cropRectangleHeight);

  cropOffsetXRatio = cropCanvas.width / cropOffsetX;
  cropOffsetYRatio = cropCanvas.height / cropOffsetY;

  cropVisible = true;
});

async function addExifDataToBlob(blobIn) {
  let blobBytes = await blobIn.arrayBuffer();
  var base64 = btoa(
    new Uint8Array(blobBytes)
      .reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  let base64Encoded = "data:image/jpeg;base64," + base64;
  let exifBytes = globalThis.piexif.dump(exifObj);
    
  var blobWithEfix = globalThis.piexif.insert(exifBytes, base64Encoded);
  let jpeg = atob(blobWithEfix.split(",")[1]);
  
  const len = jpeg.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
      bytes[i] = jpeg.charCodeAt(i);
  }
    
  let blobJpeg = new Blob([bytes]);
  return blobJpeg;
}

const saveButton = document.getElementById("saveButton");

saveButton.addEventListener("click", async (event) => {
  
  currentFileName = `TestSave ${currentFileName}`;
  //alert(`Current file name ${currentFileName}`);

  // This version takes the image from the offscreen canvas
  const options = {
        types: [
          {
            description: 'Image Files',
            accept: {
              'image/jpeg': ['.jpg'],
            },
          },
        ],
        startIn : 'pictures',
        suggestedName : currentFileName.length == 0 ?'TestSave v1.jpg': currentFileName
      };
  const typeOptions = {
    type: 'image/jpeg',
    quality : 1
  };

  const blob = await offscreenCanvas.convertToBlob(typeOptions);
  //alert("Got a blob");
  if (!('showSaveFilePicker' in window)) {
    alert("Show Save File Picker not available\non this device - Use Download");
    return;
  }
  const fileHandle = await window.showSaveFilePicker(options);
  const writable = await fileHandle.createWritable();
  let addedKeyword = addKeywordStringToExif("TestKeyword#2");
  // Write the contents of the file to the stream.
  // but first add the stored exif data

  if (piexifAvailable) {
    let blobJpeg = await addExifDataToBlob(blob);
    await writable.write(blobJpeg);
  }
  else {
    await writable.write(blob);
  }
  // Close the file and write the contents to disk.
  await writable.close();

});

const downloadButton = document.getElementById("downloadButton");

downloadButton.addEventListener("click", async (event) => {
  const options = {
    types: [
      {
        description: 'Image Files',
        accept: {
          'image/jpg': ['.jpg'],
        },
      },
    ],
    startIn : 'pictures',
    suggestedName : 'TestSave v1.jpg'
    };
    const typeOptions = {
    type: 'image/jpeg',
    quality : 1
    };

    const blob = await offscreenCanvas.convertToBlob(typeOptions);

    // Add the stored Efix data to the blob and save
    let addedKeyword = addKeywordStringToExif("TestKeyword#2");
    let url;
    if (piexifAvailable) {
      let blobJpeg = await addExifDataToBlob(blob);
      url = URL.createObjectURL(blobJpeg);
    }
    else {
      url = URL.createObjectURL(blob);
    }

    var a = document.createElement('a');
    a.href = url;
    a.download = currentFileName.length == 0 ?'TestSave v1.jpg': currentFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

const getGridConfig = document.getElementById("gridConfig");

getGridConfig.addEventListener("click", async (event) => {
  // alert("Apply clicked");
  const gridRowsSelector = document.getElementById("row-select");
  let options = gridRowsSelector.options;
  let i = gridRowsSelector.selectedIndex;
  let numberOfRowsStr = options[i].value;
  let numberOfRows = parseInt(numberOfRowsStr);
  if (isNaN(numberOfRows)) {
    return;
  }
  gridRows = numberOfRows;
  const lineThicknessRadio = document.getElementsByName("linethickness");
  
  let lineThicknessStr = "2";
  for (var n = 0; n < lineThicknessRadio.length; n++) {
    if (lineThicknessRadio[n].checked) {
        lineThicknessStr = lineThicknessRadio[n].value;
    }
  } 
  let testLineThickness = parseInt(lineThicknessStr);
  
  if (isNaN(testLineThickness)) {
    return;
  }
  gridLineThickness = testLineThickness;
});

const popoverDrawGrid = document.getElementById("drawGrid2");

popoverDrawGrid.addEventListener("click", async (event) => {
  gridButton.click();
});

function handleOver(event) {
  if (!cropVisible) {
    return;
  }
  gridInfo.innerText = `Pointer Over Event: Called`;
  ongoingTouches.clear();
  let boundingRect = cropCanvas.getBoundingClientRect();
  let eventX = event.pageX - boundingRect.left;
  let eventY = event.pageY - boundingRect.top;

  cropCanvas.style.cursor = 'default';
  cropRectangle.left = cropOffsetX;
  cropRectangle.right = cropOffsetX + cropRectangleWidth;
  cropRectangle.top = cropOffsetY;
  cropRectangle.bottom = cropOffsetY + cropRectangleHeight;

  if (((eventX < cropOffsetX - tolerance) || eventX > (cropOffsetX + cropRectangleWidth + tolerance))
    || ((eventY < cropOffsetY-tolerance) || (eventY > cropOffsetY + cropRectangleHeight + tolerance))) {
      gridInfo.innerText = `Out of bounds ${eventX} ${cropOffsetX}`;
      cropCanvas.style.cursor = 'default';
      return;
  }
  let movementType = MovementTypes.None;
  switch(true) {
    case Math.abs(cropRectangle.left - eventX) <= tolerance:
      movementType = MovementTypes.West;
      cropCanvas.style.cursor = 'ew-resize';
    break;
    case Math.abs(cropRectangle.right - eventX) <= tolerance:
      movementType = MovementTypes.East;
      cropCanvas.style.cursor = 'ew-resize';
      break;
    case Math.abs(cropRectangle.top - eventY) <= tolerance:
      movementType = MovementTypes.North;
      cropCanvas.style.cursor = 'ns-resize';
      break;
    case Math.abs(cropRectangle.bottom - eventY) <= tolerance:
      movementType = MovementTypes.South;
      cropCanvas.style.cursor = 'ns-resize';
      break;
    default:
      movementType = MovementTypes.Whole; 
      cropCanvas.style.cursor = 'grab';
    }

  switch(movementType){
    case MovementTypes.West:
      if (Math.abs(cropRectangle.top - eventY) <= tolerance) {
              movementType = MovementTypes.NW;
              cropCanvas.style.cursor = 'nwse-resize';
      }
      if (Math.abs(cropRectangle.bottom - eventY) <= tolerance) {
              movementType = MovementTypes.SW;
              cropCanvas.style.cursor = 'nesw-resize';
      }
      break;
    case MovementTypes.East:
      if (Math.abs(cropRectangle.top - eventY) <= tolerance) {
              movementType = MovementTypes.NE;
              cropCanvas.style.cursor = 'nesw-resize';
      }
      if (Math.abs(cropRectangle.bottom - eventY) <= tolerance) {
              movementType = MovementTypes.SE;
              cropCanvas.style.cursor = 'nwse-resize';
      }
      break;
    case MovementTypes.North:
      if (Math.abs(cropRectangle.left - eventX) <= tolerance) {
              movementType = MovementTypes.NW;
              cropCanvas.style.cursor = 'nwse-resize';
      }
      if (Math.abs(cropRectangle.right - eventX) <= tolerance) {
              movementType = MovementTypes.NE;
              cropCanvas.style.cursor = 'nesw-resize';
      }
      break;
    case MovementTypes.South:
      if (Math.abs(cropRectangle.left - eventX) <= tolerance) {
              movementType = MovementTypes.SW;
              cropCanvas.style.cursor = 'nesw-resize';
      }
      if (Math.abs(cropRectangle.right - eventX) <= tolerance) {
              movementType = MovementTypes.SE;
              cropCanvas.style.cursor = 'nwse-resize';
      }
      break;
    }
    gridInfo.innerText = `Pointer Over Event: ${movementType}`;
}  // pointerover event handleOver

// pointer over has left
function leavePointer(event) {
  cropCanvas.style.cursor = 'default';
}

const ongoingTouches = new Map();

function handleStart(event) {
  if (!cropVisible) {
    return;
  }
  ongoingTouches.clear();
  let boundingRect = cropCanvas.getBoundingClientRect();
  let eventX = event.pageX - boundingRect.left;
  let eventY = event.pageY - boundingRect.top;
  const touch = {
    pageX: eventX,
    pageY: eventY,
    movementType: MovementTypes.None
  };
  cropCanvas.style.cursor = 'default';
  cropRectangle.left = cropOffsetX;
  cropRectangle.right = cropOffsetX + cropRectangleWidth;
  cropRectangle.top = cropOffsetY;
  cropRectangle.bottom = cropOffsetY + cropRectangleHeight;


  if (((eventX < cropOffsetX - tolerance) || eventX > (cropOffsetX + cropRectangleWidth + tolerance))
        || ((eventY < cropOffsetY-tolerance) || (eventY > cropOffsetY + cropRectangleHeight + tolerance))) {
          gridInfo.innerText = `Out of bounds ${eventX} ${cropOffsetX}`;
          cropCanvas.style.cursor = 'default';
          return;
  }

  switch(true) {
    case Math.abs(cropRectangle.left - eventX) <= tolerance:
      touch.movementType = MovementTypes.West;
      cropCanvas.style.cursor = 'ew-resize';
    break;
    case Math.abs(cropRectangle.right - eventX) <= tolerance:
      touch.movementType = MovementTypes.East;
      cropCanvas.style.cursor = 'ew-resize';
      break;
    case Math.abs(cropRectangle.top - eventY) <= tolerance:
      touch.movementType = MovementTypes.North;
      cropCanvas.style.cursor = 'ns-resize';
      break;
    case Math.abs(cropRectangle.bottom - eventY) <= tolerance:
      touch.movementType = MovementTypes.South;
      cropCanvas.style.cursor = 'ns-resize';
      break;
    default:
      touch.movementType = MovementTypes.Whole; 
      cropCanvas.style.cursor = 'grab';
    }
  
    switch(touch.movementType){
      case MovementTypes.West:
        if (Math.abs(cropRectangle.top - eventY) <= tolerance) {
                touch.movementType = MovementTypes.NW;
                cropCanvas.style.cursor = 'nwse-resize';
        }
        if (Math.abs(cropRectangle.bottom - eventY) <= tolerance) {
                touch.movementType = MovementTypes.SW;
                cropCanvas.style.cursor = 'nesw-resize';
        }
        break;
      case MovementTypes.East:
        if (Math.abs(cropRectangle.top - eventY) <= tolerance) {
                touch.movementType = MovementTypes.NE;
                cropCanvas.style.cursor = 'nesw-resize';
        }
        if (Math.abs(cropRectangle.bottom - eventY) <= tolerance) {
                touch.movementType = MovementTypes.SE;
                cropCanvas.style.cursor = 'nwse-resize';
        }
        break;
      case MovementTypes.North:
        if (Math.abs(cropRectangle.left - eventX) <= tolerance) {
                touch.movementType = MovementTypes.NW;
                cropCanvas.style.cursor = 'nwse-resize';
        }
        if (Math.abs(cropRectangle.right - eventX) <= tolerance) {
                touch.movementType = MovementTypes.NE;
                cropCanvas.style.cursor = 'nesw-resize';
        }
        break;
      case MovementTypes.South:
        if (Math.abs(cropRectangle.left - eventX) <= tolerance) {
                touch.movementType = MovementTypes.SW;
                cropCanvas.style.cursor = 'nesw-resize';
        }
        if (Math.abs(cropRectangle.right - eventX) <= tolerance) {
                touch.movementType = MovementTypes.SE;
                cropCanvas.style.cursor = 'nwse-resize';
        }
        break;
      }
     
  
  gridInfo.innerText = `Start Event: ${touch.movementType}`;
  ongoingTouches.set(event.pointerId, touch);
}

function moveWest(xDist, rect) {
  cropOffsetX += xDist;
  cropOffsetX = Math.max(0, cropOffsetX);
  rect.left = cropOffsetX;
  cropRectangleWidth = rect.right - cropOffsetX;
}

 function moveEast(xDist, rect) {
  rect.right += xDist;
  rect.right = Math.min(rect.right, cropCanvas.width);
  cropRectangleWidth = rect.right - cropOffsetX;
}
  
function  moveNorth(yDist, rect){
  cropOffsetY += yDist;
  cropOffsetY = Math.max(0, cropOffsetY);
  rect.top = cropOffsetY;
  cropRectangleHeight = rect.bottom - cropOffsetY;
}

function moveSouth(yDist, rect){
  rect.bottom += yDist;
  rect.bottom = Math.min(rect.bottom, cropCanvas.height);
  cropRectangleHeight = rect.bottom - cropOffsetY;
}

function constrainToAspectRatio(movementType, rect) {
  console.log('Before rect.left %d, rect.right %d, rect.top %d, rect.bottom %d',rect.left, rect.right, rect.top, rect.bottom);
  let width = 0.0;
  let height = 0.0;

  switch(movementType) {
    case MovementTypes.North:
    case MovementTypes.South:
      height = rect.bottom - rect.top;
      width = height * cropAspectRatio;
      rect.right = rect.left + width;
      if (rect.right > cropCanvas.width) {
        rect.right = cropCanvas.width;
        height = (rect.right - rect.left) / cropAspectRatio;
        rect.bottom = rect.top + height; 
      }
      break;
    default:
      width = rect.right - rect.left;
      height = width / cropAspectRatio;
      rect.bottom = rect.top + height;
      if (rect.bottom > cropCanvas.height) {
        rect.bottom = cropCanvas.height;
        width = (rect.bottom - rect.top) * cropAspectRatio;
      }
    break;
  }
  
  console.log('After rect.left %d, rect.right %d, rect.top %d, rect.bottom %d',rect.left, rect.right, rect.top, rect.bottom);

  switch(movementType) {
    case MovementTypes.NW: // left/top stay where they are
      rect.right = rect.left + width;
      break;
    case MovementTypes.NE: // right/top stay where they are
      rect.left = rect.right - width;
      break;
    case MovementTypes.SW: // left/bottom stay where they are
      rect.right = rect.left + width;
      break;
    case MovementTypes.SE: // right/bottom stay where they are
      rect.left = rect.right - width;
      break;
    case MovementTypes.West:
      rect.right = rect.left + width;
      break;
    case MovementTypes.East:
      rect.left = rect.right - width;
      break;
  }
  cropOffsetX = rect.left;
  cropOffsetY = rect.top;
  cropRectangleWidth = rect.right - rect.left;
  cropRectangleHeight = rect.bottom - rect.top;
}
  
function handleMove(event) {
  if (!cropVisible) {
    return;
  }
  const touch = ongoingTouches.get(event.pointerId);

  // Event was not started
  if (!touch) {
    cropCanvas.style.cursor = 'default';
    return;
  }

  cropRectangle.left = cropOffsetX;
  cropRectangle.right = cropOffsetX + cropRectangleWidth;
  cropRectangle.top = cropOffsetY;
  cropRectangle.bottom = cropOffsetY + cropRectangleHeight;

  let boundingRect = cropCanvas.getBoundingClientRect();
  let eventX = event.pageX - boundingRect.left;
  let eventY = event.pageY - boundingRect.top;
  let xDist = eventX - touch.pageX;
  let yDist = eventY - touch.pageY;

  switch(touch.movementType) {
    case MovementTypes.West:
      moveWest(xDist, cropRectangle);
      break;
    case MovementTypes.East:
      moveEast(xDist, cropRectangle);
      break;
    case MovementTypes.North:
      moveNorth(yDist, cropRectangle);
      break;
    case MovementTypes.South:
      moveSouth(yDist, cropRectangle);
      break;
    case MovementTypes.NW:
      moveNorth(yDist, cropRectangle);
      moveWest(xDist, cropRectangle);
      break;
    case MovementTypes.NE:
      moveNorth(yDist, cropRectangle);
      moveEast(xDist, cropRectangle);
      break;
    case MovementTypes.SW:
      moveSouth(yDist, cropRectangle);
      moveWest(xDist, cropRectangle);
      break;
    case MovementTypes.SE:
      moveSouth(yDist, cropRectangle);
      moveEast(xDist, cropRectangle);
      break;
    case MovementTypes.Whole : 
      cropOffsetX += xDist;
      cropOffsetX = Math.max(0, cropOffsetX);
      cropOffsetX = Math.min(cropCanvas.width - cropRectangleWidth, cropOffsetX);
      cropOffsetY += yDist;
      cropOffsetY = Math.max(0, cropOffsetY);
      cropOffsetY = Math.min (cropCanvas.height - cropRectangleHeight, cropOffsetY);
      break;
    }
  
  if (!(touch.movementType == MovementTypes.Whole) && confineToAR) {
    // Recalculate crop rectangle
    constrainToAspectRatio(touch.movementType, cropRectangle);
  }

  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.strokeRect(cropOffsetX, cropOffsetY, cropRectangleWidth, cropRectangleHeight);
  const newTouch = {
    pageX: eventX,
    pageY: eventY,
    movementType: touch.movementType
  };

  ongoingTouches.set(event.pointerId, newTouch);
  gridInfo.innerText = `Move Event: ${touch.movementType}`;
}




function handleEnd(event) {
  const touch = ongoingTouches.get(event.pointerId);

  if (!touch) {
    console.error(`End: Could not find touch ${event.pointerId}`);
    cropCanvas.style.cursor = 'default';
    return;
  }

  cropRectangle.left = cropOffsetX;
  cropRectangle.right = cropOffsetX + cropRectangleWidth;
  cropRectangle.top = cropOffsetY;
  cropRectangle.bottom = cropOffsetY + cropRectangleHeight;

  let boundingRect = cropCanvas.getBoundingClientRect();
  let eventX = event.pageX - boundingRect.left;
  let eventY = event.pageY - boundingRect.top;
  let xDist = eventX - touch.pageX;
  let yDist = eventY - touch.pageY;

  
  switch(touch.movementType) {
    case MovementTypes.West:
      moveWest(xDist, cropRectangle);
      break;
    case MovementTypes.East:
        moveEast(xDist, cropRectangle);
        break;
    case MovementTypes.North:
      moveNorth(yDist, cropRectangle);
      break;
    case MovementTypes.South:
      moveSouth(yDist, cropRectangle);
      break;
      case MovementTypes.NW:
        moveNorth(yDist, cropRectangle);
        moveWest(xDist, cropRectangle);
        break;
      case MovementTypes.NE:
        moveNorth(yDist, cropRectangle);
        moveEast(xDist, cropRectangle);
        break;
      case MovementTypes.SW:
        moveSouth(yDist, cropRectangle);
        moveWest(xDist, cropRectangle);
        break;
      case MovementTypes.SE:
        moveSouth(yDist, cropRectangle);
        moveEast(xDist, cropRectangle);
        break;
    case MovementTypes.Whole : 
      cropOffsetX += xDist;
      cropOffsetX = Math.max(0, cropOffsetX);
      cropOffsetX = Math.min(cropCanvas.width - cropRectangleWidth, cropOffsetX);
      cropOffsetY += yDist;
      cropOffsetY = Math.max(0, cropOffsetY);
      cropOffsetY = Math.min (cropCanvas.height - cropRectangleHeight, cropOffsetY);
      break;
  }
  if (!(touch.movementType == MovementTypes.Whole) && confineToAR) {
    // Recalculate crop rectangle
    constrainToAspectRatio(touch.movementType, cropRectangle);
  }
  cropCanvas.style.cursor = 'default';
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.strokeRect(cropOffsetX, cropOffsetY, cropRectangleWidth, cropRectangleHeight);
  ongoingTouches.delete(event.pointerId);
}

cropCanvas.addEventListener("pointerdown", handleStart, false);
cropCanvas.addEventListener("pointermove", handleMove, false);
cropCanvas.addEventListener("pointerup", handleEnd, false);

cropCanvas.addEventListener("pointerover", handleOver, false);
cropCanvas.addEventListener("pointerleave", leavePointer, false);

