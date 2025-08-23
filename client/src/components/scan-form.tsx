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
import { Search } from "lucide-react";

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
    mutationFn: async (data: { url: string }) => {
      const response = await apiRequest("POST", "/api/scans", { ...data, multiPage: true });
      return response.json();
    },
    onSuccess: (data) => {
      onScanStarted(data.scanId);
      queryClient.invalidateQueries({ queryKey: ['/api/scans'] });
      toast({
        title: "Multi-Page Scan Started",
        description: "Analyzing multiple pages across your website including homepage, product pages, and checkout/booking functionality. This may take a few minutes.",
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
    createScanMutation.mutate({ url: data.url });
  };

  return (
    <Card className="p-4 sm:p-6 mb-6" data-testid="scan-form">
      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Analyze Your Website (Multi-Page Analysis)</h3>
      <p className="text-xs sm:text-sm text-slate-600 mb-4">Automatically scans multiple pages including homepage, product pages, checkout/booking functionality, and more to provide comprehensive site-wide analysis.</p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <span className="hidden sm:inline">{createScanMutation.isPending ? "Starting Multi-Page Scan..." : "Analyze Website"}</span>
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
