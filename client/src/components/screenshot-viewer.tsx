import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Maximize, X, Download, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScreenshotViewerProps {
  scanId: string;
  evidence?: any[];
}

export default function ScreenshotViewer({ scanId, evidence }: ScreenshotViewerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Find screenshot evidence
  const screenshotEvidence = evidence?.find(e => e.type === 'screenshot');
  const viewportEvidence = evidence?.find(e => e.type === 'screenshot_viewport');
  
  if (!screenshotEvidence && !viewportEvidence) {
    return null;
  }
  
  const fullPagePath = screenshotEvidence?.filePath;
  const viewportPath = viewportEvidence?.filePath || fullPagePath?.replace('.png', '_viewport.png');
  
  const handleDownload = (path: string, filename: string) => {
    const link = document.createElement('a');
    link.href = path;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleOpenInNewTab = (path: string) => {
    window.open(path, '_blank');
  };
  
  return (
    <Card className="p-6" data-testid="screenshot-viewer">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Visual Evidence</h3>
        </div>
        <div className="flex gap-2">
          {fullPagePath && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(fullPagePath, `scan_${scanId}_fullpage.png`)}
              data-testid="download-screenshot"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Viewport Screenshot */}
        {viewportPath && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700">Above the Fold</h4>
            <div 
              className="relative group cursor-pointer rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors"
              onClick={() => setSelectedImage(viewportPath)}
              data-testid="viewport-screenshot"
            >
              <img 
                src={viewportPath} 
                alt="Viewport screenshot"
                className="w-full h-auto"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                <Maximize className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p className="text-xs text-slate-500">Initial viewport (1920x1080)</p>
          </div>
        )}
        
        {/* Full Page Screenshot */}
        {fullPagePath && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700">Full Page</h4>
            <div 
              className="relative group cursor-pointer rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors"
              onClick={() => setSelectedImage(fullPagePath)}
              data-testid="fullpage-screenshot"
            >
              <div className="h-[300px] overflow-hidden">
                <img 
                  src={fullPagePath} 
                  alt="Full page screenshot"
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center pointer-events-auto">
                <Maximize className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p className="text-xs text-slate-500">Complete page capture</p>
          </div>
        )}
      </div>
      
      {/* Lightbox Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className={isFullscreen ? "max-w-full h-full m-0" : "max-w-6xl max-h-[90vh]"}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Screenshot Preview</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  data-testid="toggle-fullscreen"
                >
                  <Maximize className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectedImage && handleOpenInNewTab(selectedImage)}
                  data-testid="open-new-tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedImage(null)}
                  data-testid="close-lightbox"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex items-center justify-center p-4">
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Screenshot"
                className="max-w-full h-auto"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Visual Context:</strong> Screenshots capture the exact state of the website during analysis, 
          providing visual evidence for accessibility issues, layout problems, and performance bottlenecks.
        </p>
      </div>
    </Card>
  );
}