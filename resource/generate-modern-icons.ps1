Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent $PSScriptRoot
$OutputDir = Join-Path $Root 'src\img'
$CanvasSize = 1024
$Scale = $CanvasSize / 128

function Convert-Unit {
  param([double]$Value)
  return [single]($Value * $Scale)
}

function New-RoundedRectanglePath {
  param(
    [single]$X,
    [single]$Y,
    [single]$Width,
    [single]$Height,
    [single]$Radius
  )

  $Diameter = $Radius * 2
  $Path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $Path.AddArc($X, $Y, $Diameter, $Diameter, 180, 90)
  $Path.AddArc($X + $Width - $Diameter, $Y, $Diameter, $Diameter, 270, 90)
  $Path.AddArc($X + $Width - $Diameter, $Y + $Height - $Diameter, $Diameter, $Diameter, 0, 90)
  $Path.AddArc($X, $Y + $Height - $Diameter, $Diameter, $Diameter, 90, 90)
  $Path.CloseFigure()
  return $Path
}

function New-Pen {
  param(
    [System.Drawing.Color]$Color,
    [double]$Width
  )

  $Pen = [System.Drawing.Pen]::new($Color, (Convert-Unit $Width))
  $Pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $Pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $Pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  return $Pen
}

function Draw-Line {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Pen]$Pen,
    [double]$X1,
    [double]$Y1,
    [double]$X2,
    [double]$Y2
  )

  $Graphics.DrawLine($Pen, (Convert-Unit $X1), (Convert-Unit $Y1), (Convert-Unit $X2), (Convert-Unit $Y2))
}

function New-IconBitmap {
  $Bitmap = [System.Drawing.Bitmap]::new($CanvasSize, $CanvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $Graphics.Clear([System.Drawing.Color]::Transparent)

  $BgPath = New-RoundedRectanglePath (Convert-Unit 10) (Convert-Unit 10) (Convert-Unit 108) (Convert-Unit 108) (Convert-Unit 24)
  $BgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.PointF]::new((Convert-Unit 18), (Convert-Unit 12)),
    [System.Drawing.PointF]::new((Convert-Unit 110), (Convert-Unit 118)),
    [System.Drawing.ColorTranslator]::FromHtml('#0f766e'),
    [System.Drawing.ColorTranslator]::FromHtml('#123a63')
  )
  $Blend = [System.Drawing.Drawing2D.ColorBlend]::new()
  $Blend.Positions = [single[]](0, 0.62, 1)
  $Blend.Colors = [System.Drawing.Color[]](
    [System.Drawing.ColorTranslator]::FromHtml('#0f766e'),
    [System.Drawing.ColorTranslator]::FromHtml('#0b4f7a'),
    [System.Drawing.ColorTranslator]::FromHtml('#123a63')
  )
  $BgBrush.InterpolationColors = $Blend
  $Graphics.FillPath($BgBrush, $BgPath)

  $FieldPen = New-Pen ([System.Drawing.ColorTranslator]::FromHtml('#d9eef8')) 8
  Draw-Line $Graphics $FieldPen 33 38 83 38
  Draw-Line $Graphics $FieldPen 33 55 71 55
  Draw-Line $Graphics $FieldPen 33 72 61 72

  $LensRect = [System.Drawing.RectangleF]::new((Convert-Unit 29), (Convert-Unit 28), (Convert-Unit 60), (Convert-Unit 60))
  $LensPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $LensPath.AddEllipse($LensRect)
  $LensBrush = [System.Drawing.Drawing2D.PathGradientBrush]::new($LensPath)
  $LensBrush.CenterPoint = [System.Drawing.PointF]::new((Convert-Unit 47), (Convert-Unit 41))
  $LensBrush.CenterColor = [System.Drawing.Color]::FromArgb(238, 248, 251, 255)
  $LensBrush.SurroundColors = [System.Drawing.Color[]]([System.Drawing.Color]::FromArgb(136, 182, 216, 239))
  $Graphics.FillEllipse($LensBrush, $LensRect)

  $LensStroke = New-Pen ([System.Drawing.Color]::White) 7
  $Graphics.DrawEllipse($LensStroke, $LensRect)

  $HandleUnder = New-Pen ([System.Drawing.Color]::White) 12
  Draw-Line $Graphics $HandleUnder 81 81 104 104
  $HandlePen = New-Pen ([System.Drawing.ColorTranslator]::FromHtml('#172033')) 6
  Draw-Line $Graphics $HandlePen 83 83 104 104

  $LensLine = New-Pen ([System.Drawing.Color]::FromArgb(178, 12, 98, 115)) 5
  Draw-Line $Graphics $LensLine 42 50 77 50

  $Graphics.Dispose()
  $BgPath.Dispose()
  $BgBrush.Dispose()
  $FieldPen.Dispose()
  $LensPath.Dispose()
  $LensBrush.Dispose()
  $LensStroke.Dispose()
  $HandleUnder.Dispose()
  $HandlePen.Dispose()
  $LensLine.Dispose()

  return $Bitmap
}

function Save-ResizedIcon {
  param(
    [System.Drawing.Bitmap]$Source,
    [int]$Size,
    [string]$Path
  )

  $Bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $Graphics.Clear([System.Drawing.Color]::Transparent)
  $Graphics.DrawImage($Source, 0, 0, $Size, $Size)
  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $Graphics.Dispose()
  $Bitmap.Dispose()
}

$Source = New-IconBitmap
try {
  foreach ($Size in @(16, 24, 32, 48, 128)) {
    Save-ResizedIcon $Source $Size (Join-Path $OutputDir "icon$Size.png")
  }
} finally {
  $Source.Dispose()
}
