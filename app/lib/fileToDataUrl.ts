const MAX_WIDTH = 800
const MAX_HEIGHT = 800
const INITIAL_WEBP_QUALITY = 0.72
const MIN_WEBP_QUALITY = 0.4
const QUALITY_STEP = 0.06
const MAX_OUTPUT_SIZE_BYTES = 200 * 1024
const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("No se pudo procesar la imagen seleccionada."))
    }

    image.src = objectUrl
  })
}

export async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen valido.")
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("La imagen es demasiado pesada. Usa una menor a 6 MB.")
  }

  const image = await loadImage(file)
  const widthRatio = MAX_WIDTH / Math.max(image.width || 1, 1)
  const heightRatio = MAX_HEIGHT / Math.max(image.height || 1, 1)
  const scale = Math.min(1, widthRatio, heightRatio)

  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("No se pudo preparar la imagen seleccionada.")
  }

  context.drawImage(image, 0, 0, width, height)
  return canvasToOptimizedWebp(canvas, width, height)
}

function dataUrlSizeInBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || ""
  const padding = (base64.match(/=*$/)?.[0].length || 0)
  return Math.floor((base64.length * 3) / 4) - padding
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number) {
  const result = canvas.toDataURL("image/webp", quality)

  if (!result) {
    throw new Error("No se pudo convertir la imagen seleccionada.")
  }

  return result
}

function redrawScaledCanvas(sourceCanvas: HTMLCanvasElement, scale: number) {
  const nextCanvas = document.createElement("canvas")
  nextCanvas.width = Math.max(1, Math.round(sourceCanvas.width * scale))
  nextCanvas.height = Math.max(1, Math.round(sourceCanvas.height * scale))

  const nextContext = nextCanvas.getContext("2d")
  if (!nextContext) {
    throw new Error("No se pudo optimizar la imagen seleccionada.")
  }

  nextContext.drawImage(sourceCanvas, 0, 0, nextCanvas.width, nextCanvas.height)
  return nextCanvas
}

function canvasToOptimizedWebp(
  baseCanvas: HTMLCanvasElement,
  initialWidth: number,
  initialHeight: number
) {
  let workingCanvas = baseCanvas
  let quality = INITIAL_WEBP_QUALITY
  let bestResult = canvasToDataUrl(workingCanvas, quality)

  while (quality >= MIN_WEBP_QUALITY) {
    const attempt = canvasToDataUrl(workingCanvas, quality)
    bestResult = attempt

    if (dataUrlSizeInBytes(attempt) <= MAX_OUTPUT_SIZE_BYTES) {
      return attempt
    }

    quality = Number((quality - QUALITY_STEP).toFixed(2))
  }

  let currentWidth = initialWidth
  let currentHeight = initialHeight

  while (
    dataUrlSizeInBytes(bestResult) > MAX_OUTPUT_SIZE_BYTES &&
    currentWidth > 320 &&
    currentHeight > 320
  ) {
    workingCanvas = redrawScaledCanvas(workingCanvas, 0.88)
    currentWidth = workingCanvas.width
    currentHeight = workingCanvas.height

    quality = INITIAL_WEBP_QUALITY

    while (quality >= MIN_WEBP_QUALITY) {
      const attempt = canvasToDataUrl(workingCanvas, quality)
      bestResult = attempt

      if (dataUrlSizeInBytes(attempt) <= MAX_OUTPUT_SIZE_BYTES) {
        return attempt
      }

      quality = Number((quality - QUALITY_STEP).toFixed(2))
    }
  }

  return bestResult
}
