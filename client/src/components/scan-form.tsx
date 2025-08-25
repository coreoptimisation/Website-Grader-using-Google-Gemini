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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Search, Zap, Layers, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const scanFormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  scanType: z.enum(["single", "multi"]).default("multi"),
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

  const form = useForm<ScanFormData>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: {
      url: "",
      scanType: "multi",
      accessibility: true,
      performance: true,
      security: true,
      agentReady: true
    }
  });

  const createScanMutation = useMutation({
    mutationFn: async (data: { url: string; scanType: string }) => {
      const response = await apiRequest("POST", "/api/scans", { 
        url: data.url, 
        multiPage: data.scanType === "multi" 
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      onScanStarted(data.scanId);
      queryClient.invalidateQueries({ queryKey: ['/api/scans'] });
      const isMulti = variables.scanType === "multi";
      toast({
        title: isMulti ? "Multi-Page Scan Started" : "Single-Page Scan Started",
        description: isMulti 
          ? "Analyzing 4 critical pages across your website including homepage, product pages, and checkout/booking functionality. This comprehensive analysis takes 3-6 minutes."
          : "Quickly analyzing your homepage for key metrics. Results available in 30-60 seconds.",
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
    createScanMutation.mutate({ url: data.url, scanType: data.scanType });
  };

  return (
    <Card className="p-4 sm:p-6 mb-6" data-testid="scan-form">
      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Analyze Your Website</h3>
      <p className="text-xs sm:text-sm text-slate-600 mb-4">Choose between a quick homepage scan or comprehensive multi-page analysis.</p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Scan Type Selector */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-slate-700">Scan Type</Label>
          <RadioGroup 
            value={form.watch("scanType")} 
            onValueChange={(value) => form.setValue("scanType", value as "single" | "multi")}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Single Page Option */}
            <div className="relative">
              <RadioGroupItem 
                value="single" 
                id="single-scan" 
                className="peer sr-only" 
              />
              <Label 
                htmlFor="single-scan" 
                className="flex flex-col p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 peer-checked:border-blue-600 peer-checked:bg-blue-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-slate-900">Quick Scan</span>
                  </div>
                  <span className="text-xs text-slate-500">30-60 seconds</span>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>✓ Homepage only</p>
                  <p>✓ Fast results</p>
                  <p>✓ Core metrics</p>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  <strong>Best for:</strong> Quick health checks, monitoring, or initial assessment
                </div>
              </Label>
            </div>

            {/* Multi Page Option */}
            <div className="relative">
              <RadioGroupItem 
                value="multi" 
                id="multi-scan" 
                className="peer sr-only" 
              />
              <Label 
                htmlFor="multi-scan" 
                className="flex flex-col p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 peer-checked:border-blue-600 peer-checked:bg-blue-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-slate-900">Deep Analysis</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Analyzes 4 critical pages: Homepage, Shop/Products, Checkout/Booking, and Trust/Content pages</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-xs text-slate-500">3-6 minutes</span>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>✓ 4 critical pages analyzed</p>
                  <p>✓ E-commerce & booking detection</p>
                  <p>✓ Site-wide issues identified</p>
                  <p>✓ Comprehensive recommendations</p>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  <strong>Best for:</strong> Full audits, pre-launch checks, or finding site-wide issues
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
          <div className="flex-1">
            <Label htmlFor="website-url" className="block text-sm font-medium text-slate-700 mb-2">
              Website URL
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
              title="Analyzes multiple pages including homepage, product pages, and checkout/booking functionality"
            >
              <Search className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{createScanMutation.isPending ? "Starting Scan..." : "Analyze Website"}</span>
              <span className="sm:hidden">{createScanMutation.isPending ? "Scanning..." : "Analyze"}</span>
            </Button>
          </div>
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
