import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, X, AlertCircle } from "lucide-react";

const scanFormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  accessibility: z.boolean().default(true),
  performance: z.boolean().default(true),
  security: z.boolean().default(true),
  agentReady: z.boolean().default(true)
});

type ScanFormData = z.infer<typeof scanFormSchema>;

interface ScanFormProps {
  onScanStarted: (scanId: string) => void;
}

export default function ScanForm({ onScanStarted }: ScanFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [additionalUrls, setAdditionalUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  const form = useForm<ScanFormData>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: {
      url: "",
      accessibility: true,
      performance: true,
      security: true,
      agentReady: true
    }
  });

  const createScanMutation = useMutation({
    mutationFn: async (data: { url: string; selectedUrls: string[] }) => {
      const response = await apiRequest("POST", "/api/scans", { ...data, multiPage: true });
      return response.json();
    },
    onSuccess: (data) => {
      onScanStarted(data.scanId);
      queryClient.invalidateQueries({ queryKey: ['/api/scans'] });
      toast({
        title: "Scan Started",
        description: `Analyzing ${additionalUrls.length + 1} page${additionalUrls.length > 0 ? 's' : ''} of your website. This may take a few minutes.`,
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start scan. Please try again.",
        variant: "destructive",
      });
      console.error("Scan creation error:", error);
    }
  });

  const onSubmit = (data: ScanFormData) => {
    // Always include the homepage plus any additional URLs
    const selectedUrls = [data.url, ...additionalUrls];
    createScanMutation.mutate({ url: data.url, selectedUrls });
  };

  const addUrl = () => {
    setUrlError("");
    
    // Validate URL format
    try {
      const urlObj = new URL(newUrl);
      
      // Check if URL is already added
      if (additionalUrls.includes(newUrl)) {
        setUrlError("This URL has already been added");
        return;
      }
      
      // Add to list (max 3 additional URLs)
      if (additionalUrls.length >= 3) {
        setUrlError("Maximum 4 pages total (including homepage)");
        return;
      }
      
      setAdditionalUrls([...additionalUrls, newUrl]);
      setNewUrl("");
    } catch (error) {
      setUrlError("Please enter a valid URL");
    }
  };

  const removeUrl = (urlToRemove: string) => {
    setAdditionalUrls(additionalUrls.filter(url => url !== urlToRemove));
  };

  return (
    <Card className="p-4 sm:p-6 mb-6" data-testid="scan-form">
      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Analyze Your Website</h3>
      <p className="text-xs sm:text-sm text-slate-600 mb-4">Select specific pages to analyze. The homepage will always be included in the analysis.</p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
          <div className="flex-1">
            <Label htmlFor="website-url" className="block text-sm font-medium text-slate-700 mb-2">
              Homepage URL (Required)
            </Label>
            <Input
              id="website-url"
              type="url"
              placeholder="https://example.com"
              {...form.register("url")}
              className="w-full"
              data-testid="input-url"
            />
            {form.formState.errors.url && (
              <p className="text-sm text-red-600 mt-1" data-testid="error-url">
                {form.formState.errors.url.message}
              </p>
            )}
          </div>
          <div className="flex items-end">
            <Button 
              type="submit" 
              disabled={createScanMutation.isPending}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 font-medium"
              data-testid="button-start-scan"
              title="Analyze selected pages"
            >
              <Search className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{createScanMutation.isPending ? 
                `Analyzing ${additionalUrls.length + 1} page${additionalUrls.length > 0 ? 's' : ''}...` : 
                `Analyze ${additionalUrls.length + 1} Page${additionalUrls.length > 0 ? 's' : ''}`
              }</span>
              <span className="sm:hidden">{createScanMutation.isPending ? "Scanning..." : "Analyze"}</span>
            </Button>
          </div>
        </div>
        
        {/* Additional URLs Section */}
        <div className="border-t pt-4">
          <Label className="block text-sm font-medium text-slate-700 mb-2">
            Additional Pages to Analyze (Optional)
          </Label>
          <p className="text-xs text-slate-500 mb-3">
            Add specific pages you want to analyze (e.g., product pages, checkout, contact). Max 4 pages total.
          </p>
          
          {/* List of added URLs */}
          {additionalUrls.length > 0 && (
            <div className="mb-3 space-y-2">
              {additionalUrls.map((url, index) => (
                <div key={index} className="flex items-center gap-2 bg-slate-50 p-2 rounded" data-testid={`added-url-${index}`}>
                  <span className="text-sm text-slate-700 flex-1 truncate">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeUrl(url)}
                    className="text-red-500 hover:text-red-700"
                    data-testid={`remove-url-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new URL input */}
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://example.com/products"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setUrlError("");
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addUrl();
                }
              }}
              className="flex-1"
              data-testid="input-additional-url"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addUrl}
              disabled={!newUrl}
              data-testid="button-add-url"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {urlError && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {urlError}
            </p>
          )}
        </div>
        
        {/* Scan Options */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-slate-200">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="accessibility"
              {...form.register("accessibility")}
              defaultChecked
              data-testid="checkbox-accessibility"
            />
            <Label htmlFor="accessibility" className="text-sm text-slate-700">
              Accessibility
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="performance"
              {...form.register("performance")}
              defaultChecked
              data-testid="checkbox-performance"
            />
            <Label htmlFor="performance" className="text-sm text-slate-700">
              Performance
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="security"
              {...form.register("security")}
              defaultChecked
              data-testid="checkbox-security"
            />
            <Label htmlFor="security" className="text-sm text-slate-700">
              Security
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="agent-ready"
              {...form.register("agentReady")}
              defaultChecked
              data-testid="checkbox-agent-ready"
            />
            <Label htmlFor="agent-ready" className="text-sm text-slate-700">
              Agent Ready
            </Label>
          </div>
        </div>
      </form>
    </Card>
  );
}
