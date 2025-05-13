import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertJournalEntrySchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Image, Loader2, Upload, X } from "lucide-react";

// Define the form schema with client-side validation
const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  content: z.string().min(10, { message: "Content must be at least 10 characters" }),
  mood: z.enum(["happy", "calm", "neutral", "sad", "frustrated"]).default("neutral"),
  tags: z.string().optional(),
  imageUrl: z.string().optional(),
});

// Define the form input values type
type FormInputValues = z.infer<typeof formSchema>;

// Transform function to convert form data to API format
const transformFormData = (data: FormInputValues) => {
  return {
    ...data,
    tags: data.tags 
      ? data.tags.split(',').map(tag => tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`) 
      : []
  };
};

interface JournalFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<FormInputValues>;
}

export function JournalForm({ onSuccess, defaultValues }: JournalFormProps) {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(defaultValues?.imageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormInputValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      content: defaultValues?.content || "",
      mood: defaultValues?.mood || "neutral",
      tags: defaultValues?.tags || "",
      imageUrl: defaultValues?.imageUrl || "",
    },
  });

  const createJournalMutation = useMutation({
    mutationFn: async (data: FormInputValues) => {
      const transformedData = transformFormData(data);
      const response = await apiRequest("POST", "/api/journal", transformedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({
        title: "Success",
        description: "Journal entry created successfully!",
      });
      form.reset({
        title: "",
        content: "",
        mood: "neutral",
        tags: "",
        imageUrl: "",
      });
      setImagePreview(null);
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create journal entry",
        variant: "destructive",
      });
    },
  });

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileType = file.type;
    if (!fileType.match(/image\/(jpeg|jpg|png|gif|webp)/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, GIF, WEBP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/journal/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setImagePreview(data.imageUrl);
      form.setValue("imageUrl", data.imageUrl);
    } catch (error) {
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    form.setValue("imageUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = (data: FormInputValues) => {
    createJournalMutation.mutate(data);
  };

  const isSubmitting = form.formState.isSubmitting || createJournalMutation.isPending;

  const moodOptions = [
    { emoji: "😊", value: "happy", label: "Happy" },
    { emoji: "😌", value: "calm", label: "Calm" },
    { emoji: "😐", value: "neutral", label: "Neutral" },
    { emoji: "😔", value: "sad", label: "Sad" },
    { emoji: "😤", value: "frustrated", label: "Frustrated" },
  ];

  return (
    <Card className="shadow-md overflow-visible">
      <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
        <CardTitle className="font-quicksand text-lg sm:text-xl">New Journal Entry</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="My thoughts today..." 
                      className="h-10 md:h-11 rounded-md"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Journal Entry</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Share your thoughts and reflections..." 
                      className="min-h-[120px] md:min-h-[150px] rounded-md" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How are you feeling?</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a mood" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {moodOptions.map((mood) => (
                        <SelectItem key={mood.value} value={mood.value}>
                          <span className="flex items-center gap-2">
                            <span>{mood.emoji}</span>
                            <span>{mood.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma separated)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="gratitude, reflection, goals..." 
                      className="h-10 md:h-11 rounded-md"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image (optional)</FormLabel>
                  <div className="space-y-2">
                    <input
                      type="hidden"
                      {...field}
                    />
                    
                    {!imagePreview && (
                      <div className="flex items-center gap-2">
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                          className="hidden"
                          id="image-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-full min-h-[44px] text-base rounded-md"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-5 w-5" />
                              Upload Image
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {imagePreview && (
                      <div className="relative rounded-md overflow-hidden">
                        <div className="max-h-[200px] overflow-hidden">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-auto object-contain"
                            loading="lazy"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 sticky bottom-0 md:relative md:bottom-auto pb-4 md:pb-0 bg-background">
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full min-h-[50px] text-base font-medium rounded-md shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Entry"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}