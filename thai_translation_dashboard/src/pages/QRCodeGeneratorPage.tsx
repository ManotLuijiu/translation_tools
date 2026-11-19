import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  QrCode,
  Link,
  FileText,
  Wifi,
  Contact,
  Download,
  Copy,
  RefreshCw,
  Image as ImageIcon,
  Settings,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import QRCodeLib from 'qrcode';

type QRType = 'url' | 'text' | 'wifi' | 'vcard';

type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

interface WifiConfig {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

interface VCardConfig {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  organization: string;
  title: string;
  website: string;
  address: string;
}

const QRCodeGeneratorPage: React.FC = () => {
  // QR Type state
  const [qrType, setQrType] = useState<QRType>('url');

  // Common settings
  const [size, setSize] = useState<number>(300);
  const [fgColor, setFgColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [errorCorrectionLevel, setErrorCorrectionLevel] =
    useState<ErrorCorrectionLevel>('M');
  const [margin, setMargin] = useState<number>(4);

  // URL/Text content
  const [urlContent, setUrlContent] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');

  // WiFi config
  const [wifiConfig, setWifiConfig] = useState<WifiConfig>({
    ssid: '',
    password: '',
    encryption: 'WPA',
    hidden: false,
  });

  // vCard config
  const [vcardConfig, setVcardConfig] = useState<VCardConfig>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    organization: '',
    title: '',
    website: '',
    address: '',
  });

  // Logo state
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(50);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Preview and generation state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Generate WiFi QR string
  const generateWifiString = useCallback((): string => {
    const { ssid, password, encryption, hidden } = wifiConfig;
    const hiddenStr = hidden ? ';H' : '';
    const passwordStr = password ? `;P:${password}` : '';
    return `WIFI:T:${encryption};S:${ssid}${passwordStr}${hiddenStr};`;
  }, [wifiConfig]);

  // Generate vCard string
  const generateVCardString = useCallback((): string => {
    const { firstName, lastName, phone, email, organization, title, website, address } = vcardConfig;
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${lastName};${firstName};;;`,
      `FN:${firstName} ${lastName}`.trim(),
    ];
    if (phone) lines.push(`TEL:${phone}`);
    if (email) lines.push(`EMAIL:${email}`);
    if (organization) lines.push(`ORG:${organization}`);
    if (title) lines.push(`TITLE:${title}`);
    if (website) lines.push(`URL:${website}`);
    if (address) lines.push(`ADR:;;${address};;;;`);
    lines.push('END:VCARD');
    return lines.join('\n');
  }, [vcardConfig]);

  // Get current QR content based on type
  const getQRContent = useCallback((): string => {
    switch (qrType) {
      case 'url':
        return urlContent;
      case 'text':
        return textContent;
      case 'wifi':
        return generateWifiString();
      case 'vcard':
        return generateVCardString();
      default:
        return '';
    }
  }, [qrType, urlContent, textContent, generateWifiString, generateVCardString]);

  // Generate QR Code
  const generateQRCode = useCallback(async () => {
    const content = getQRContent();
    if (!content) {
      toast.error('Please enter content for the QR code');
      return;
    }

    setIsGenerating(true);
    try {
      const options: QRCodeLib.QRCodeToDataURLOptions = {
        width: size,
        margin: margin,
        color: {
          dark: fgColor,
          light: bgColor,
        },
        errorCorrectionLevel: errorCorrectionLevel,
      };

      const dataUrl = await QRCodeLib.toDataURL(content, options);
      setQrDataUrl(dataUrl);

      // If there's a logo, we need to draw it on the canvas
      if (logoImage && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Load the QR code
          const qrImage = new window.Image();
          qrImage.onload = () => {
            canvas.width = size;
            canvas.height = size;
            ctx.drawImage(qrImage, 0, 0, size, size);

            // Draw logo in center
            const logoPx = Math.min(logoSize, size * 0.2);
            const logoX = (size - logoPx) / 2;
            const logoY = (size - logoPx) / 2;

            // Draw white background for logo
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, logoPx / 2 + 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw logo
            const logoImg = new window.Image();
            logoImg.onload = () => {
              ctx.drawImage(logoImg, logoX, logoY, logoPx, logoPx);
              setQrDataUrl(canvas.toDataURL('image/png'));
            };
            logoImg.src = logoImage;
          };
          qrImage.src = dataUrl;
        }
      }

      toast.success('QR Code generated!');
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  }, [
    getQRContent,
    size,
    margin,
    fgColor,
    bgColor,
    errorCorrectionLevel,
    logoImage,
    logoSize,
  ]);

  // Auto-generate on content change (debounced)
  useEffect(() => {
    const content = getQRContent();
    if (content && content.length > 0) {
      const timer = setTimeout(() => {
        generateQRCode();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [getQRContent, fgColor, bgColor, size, margin, errorCorrectionLevel, logoImage, logoSize]);

  // Handle logo upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 500 * 1024) {
      toast.error('Logo file must be smaller than 500KB');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoImage(e.target?.result as string);
      toast.success('Logo uploaded!');
    };
    reader.readAsDataURL(file);
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setLogoImage(null);
    setLogoFile(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  // Download PNG
  const handleDownloadPNG = () => {
    if (!qrDataUrl) {
      toast.error('Generate a QR code first');
      return;
    }

    const link = document.createElement('a');
    link.download = `qrcode-${Date.now()}.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success('QR Code downloaded as PNG!');
  };

  // Download SVG
  const handleDownloadSVG = async () => {
    const content = getQRContent();
    if (!content) {
      toast.error('Please enter content for the QR code');
      return;
    }

    setIsGenerating(true);
    try {
      const svgString = await QRCodeLib.toString(content, {
        type: 'svg',
        width: size,
        margin: margin,
        color: {
          dark: fgColor,
          light: bgColor,
        },
        errorCorrectionLevel: errorCorrectionLevel,
      });

      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qrcode-${Date.now()}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('QR Code downloaded as SVG!');
    } catch (error) {
      console.error('Error generating SVG:', error);
      toast.error('Failed to generate SVG');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    if (!qrDataUrl) {
      toast.error('Generate a QR code first');
      return;
    }

    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      toast.success('QR Code copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  // Validation check
  const isContentValid = (): boolean => {
    switch (qrType) {
      case 'url':
        return urlContent.length > 0;
      case 'text':
        return textContent.length > 0;
      case 'wifi':
        return wifiConfig.ssid.length > 0;
      case 'vcard':
        return vcardConfig.firstName.length > 0 || vcardConfig.lastName.length > 0;
      default:
        return false;
    }
  };

  // Render type-specific input
  const renderTypeInput = () => {
    switch (qrType) {
      case 'url':
        return (
          <div className="space-y-2">
            <Label htmlFor="url-input">URL</Label>
            <Input
              id="url-input"
              type="url"
              placeholder="https://example.com"
              value={urlContent}
              onChange={(e) => setUrlContent(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Enter a URL to encode (e.g., https://your-website.com)
            </p>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor="text-input">Text Content</Label>
            <Textarea
              id="text-input"
              placeholder="Enter any text content..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Enter any text, message, or note to encode
            </p>
          </div>
        );

      case 'wifi':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wifi-ssid">Network Name (SSID)</Label>
                <Input
                  id="wifi-ssid"
                  placeholder="MyWiFiNetwork"
                  value={wifiConfig.ssid}
                  onChange={(e) =>
                    setWifiConfig({ ...wifiConfig, ssid: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wifi-password">Password</Label>
                <Input
                  id="wifi-password"
                  type="password"
                  placeholder="Enter password"
                  value={wifiConfig.password}
                  onChange={(e) =>
                    setWifiConfig({ ...wifiConfig, password: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Encryption Type</Label>
                <Select
                  value={wifiConfig.encryption}
                  onValueChange={(v) =>
                    setWifiConfig({
                      ...wifiConfig,
                      encryption: v as 'WPA' | 'WEP' | 'nopass',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WPA">WPA/WPA2</SelectItem>
                    <SelectItem value="WEP">WEP</SelectItem>
                    <SelectItem value="nopass">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="wifi-hidden"
                    checked={wifiConfig.hidden}
                    onCheckedChange={(checked) =>
                      setWifiConfig({ ...wifiConfig, hidden: checked })
                    }
                  />
                  <Label htmlFor="wifi-hidden" className="cursor-pointer">
                    Hidden Network
                  </Label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'vcard':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vcard-first">First Name</Label>
                <Input
                  id="vcard-first"
                  placeholder="John"
                  value={vcardConfig.firstName}
                  onChange={(e) =>
                    setVcardConfig({ ...vcardConfig, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vcard-last">Last Name</Label>
                <Input
                  id="vcard-last"
                  placeholder="Doe"
                  value={vcardConfig.lastName}
                  onChange={(e) =>
                    setVcardConfig({ ...vcardConfig, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vcard-phone">Phone</Label>
                <Input
                  id="vcard-phone"
                  type="tel"
                  placeholder="+66 XX XXX XXXX"
                  value={vcardConfig.phone}
                  onChange={(e) =>
                    setVcardConfig({ ...vcardConfig, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vcard-email">Email</Label>
                <Input
                  id="vcard-email"
                  type="email"
                  placeholder="john@example.com"
                  value={vcardConfig.email}
                  onChange={(e) =>
                    setVcardConfig({ ...vcardConfig, email: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vcard-org">Organization</Label>
                <Input
                  id="vcard-org"
                  placeholder="Company Name"
                  value={vcardConfig.organization}
                  onChange={(e) =>
                    setVcardConfig({
                      ...vcardConfig,
                      organization: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vcard-title">Job Title</Label>
                <Input
                  id="vcard-title"
                  placeholder="Manager"
                  value={vcardConfig.title}
                  onChange={(e) =>
                    setVcardConfig({ ...vcardConfig, title: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vcard-website">Website</Label>
                <Input
                  id="vcard-website"
                  type="url"
                  placeholder="https://example.com"
                  value={vcardConfig.website}
                  onChange={(e) =>
                    setVcardConfig({ ...vcardConfig, website: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vcard-address">Address</Label>
                <Input
                  id="vcard-address"
                  placeholder="123 Main St, City"
                  value={vcardConfig.address}
                  onChange={(e) =>
                    setVcardConfig({ ...vcardConfig, address: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">QRCode Generator</h1>
        <p className="text-muted-foreground">
          Generate QR codes for URLs, text, WiFi, vCards with PNG/SVG export
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Settings */}
        <div className="space-y-6">
          {/* QR Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code Type
              </CardTitle>
              <CardDescription>
                Select the type of QR code you want to generate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={qrType}
                onValueChange={(v) => setQrType(v as QRType)}
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="url" className="flex items-center gap-1">
                    <Link className="h-4 w-4" />
                    <span className="hidden sm:inline">URL</span>
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Text</span>
                  </TabsTrigger>
                  <TabsTrigger value="wifi" className="flex items-center gap-1">
                    <Wifi className="h-4 w-4" />
                    <span className="hidden sm:inline">WiFi</span>
                  </TabsTrigger>
                  <TabsTrigger value="vcard" className="flex items-center gap-1">
                    <Contact className="h-4 w-4" />
                    <span className="hidden sm:inline">vCard</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={qrType} className="mt-4">
                  {renderTypeInput()}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* QR Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                QR Code Settings
              </CardTitle>
              <CardDescription>
                Customize the appearance of your QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Size */}
              <div className="space-y-2">
                <Label>Size: {size}px</Label>
                <Slider
                  value={[size]}
                  onValueChange={(v) => setSize(v[0])}
                  min={100}
                  max={600}
                  step={50}
                />
              </div>

              {/* Error Correction Level */}
              <div className="space-y-2">
                <Label>Error Correction Level</Label>
                <Select
                  value={errorCorrectionLevel}
                  onValueChange={(v) =>
                    setErrorCorrectionLevel(v as ErrorCorrectionLevel)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">
                      Low (7%) - Smallest, fastest
                    </SelectItem>
                    <SelectItem value="M">
                      Medium (15%) - Default
                    </SelectItem>
                    <SelectItem value="Q">
                      Quartile (25%) - Good for logos
                    </SelectItem>
                    <SelectItem value="H">
                      High (30%) - Best for logos/wear
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Higher levels allow more damage but increase QR complexity
                </p>
              </div>

              {/* Margin */}
              <div className="space-y-2">
                <Label>Quiet Zone (Margin): {margin}</Label>
                <Slider
                  value={[margin]}
                  onValueChange={(v) => setMargin(v[0])}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fg-color">Foreground Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="fg-color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bg-color">Background Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="bg-color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Logo (Optional)
              </CardTitle>
              <CardDescription>
                Add a logo to the center of your QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="logo-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </label>
              </Button>

              {logoImage && (
                <>
                  <div className="flex items-center gap-4">
                    <img
                      src={logoImage}
                      alt="Logo preview"
                      className="w-16 h-16 object-contain border rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{logoFile?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(logoFile?.size ?? 0 / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveLogo}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Logo Size: {logoSize}px</Label>
                    <Slider
                      value={[logoSize]}
                      onValueChange={(v) => setLogoSize(v[0])}
                      min={20}
                      max={100}
                      step={5}
                    />
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Using a logo requires higher error correction level (Q or H)
                      to ensure the QR code remains scannable.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Preview & Download */}
        <div className="space-y-6">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Your QR code preview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg min-h-[300px] p-4">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code Preview"
                    className="max-w-full max-h-[400px] object-contain"
                    style={{
                      imageRendering: 'pixelated',
                    }}
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <QrCode className="h-24 w-24 mx-auto mb-4 opacity-30" />
                    <p>Enter content to generate QR code</p>
                  </div>
                )}
              </div>

              {/* Hidden canvas for logo compositing */}
              <canvas ref={canvasRef} className="hidden" />

              {!isContentValid() && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please fill in the required fields to generate a QR code
                  </AlertDescription>
                </Alert>
              )}

              {isContentValid() && !qrDataUrl && (
                <Button
                  onClick={generateQRCode}
                  className="w-full"
                  size="lg"
                  disabled={isGenerating}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`}
                  />
                  Generate QR Code
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Download Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>Download your QR code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  onClick={handleDownloadPNG}
                  disabled={!qrDataUrl}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  PNG
                </Button>
                <Button
                  onClick={handleDownloadSVG}
                  disabled={!isContentValid()}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  SVG
                </Button>
                <Button
                  onClick={handleCopyToClipboard}
                  disabled={!qrDataUrl}
                  variant="secondary"
                  className="w-full"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>

              <div className="border-t pt-4">
                <Button
                  onClick={generateQRCode}
                  variant="ghost"
                  className="w-full"
                  disabled={isGenerating || !isContentValid()}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`}
                  />
                  Regenerate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>QR Code Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Test your QR code with multiple devices before printing</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Use high error correction (Q or H) when adding logos</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Ensure sufficient contrast between foreground and background</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Keep QR code size at least 2cm x 2cm when printed</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGeneratorPage;
