import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useCreateMessage, useGetAccounts } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Paperclip } from "lucide-react";

const composeSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message body is required"),
});

type ComposeValues = z.infer<typeof composeSchema>;

export function ComposeModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: accounts } = useGetAccounts();
  const createMessage = useCreateMessage();
  const { toast } = useToast();

  const form = useForm<ComposeValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      accountId: "",
      to: "",
      subject: "",
      body: "",
    },
  });

  const onSubmit = (data: ComposeValues) => {
    createMessage.mutate({
      data: {
        accountId: parseInt(data.accountId, 10),
        toList: data.to,
        subject: data.subject,
        bodyText: data.body,
        folder: "Sent",
        fromName: "Me", // Mocked
        fromEmail: accounts?.find(a => a.id === parseInt(data.accountId, 10))?.email || "me@example.com",
        receivedAt: new Date().toISOString(),
      }
    }, {
      onSuccess: () => {
        toast({ title: "Message sent successfully" });
        onOpenChange(false);
        form.reset();
      },
      onError: () => {
        toast({ title: "Failed to send message", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between">
          <DialogTitle className="text-lg font-semibold">New Message</DialogTitle>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-4 space-y-0 border-b pb-4">
                    <FormLabel className="w-16 text-right text-muted-foreground font-normal">From</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="border-0 shadow-none focus:ring-0 bg-transparent flex-1 px-0 h-auto">
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts?.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>
                              {acc.email} <span className="text-muted-foreground ml-2">({acc.provider})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-4 space-y-0 border-b pb-4">
                    <FormLabel className="w-16 text-right text-muted-foreground font-normal">To</FormLabel>
                    <FormControl>
                      <Input {...field} className="border-0 shadow-none focus-visible:ring-0 px-0 rounded-none bg-transparent" placeholder="Recipient email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-4 space-y-0 border-b pb-4">
                    <FormLabel className="w-16 text-right text-muted-foreground font-normal">Subject</FormLabel>
                    <FormControl>
                      <Input {...field} className="border-0 shadow-none focus-visible:ring-0 px-0 rounded-none bg-transparent font-medium" placeholder="Message subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem className="flex-1 flex flex-col pt-2">
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 px-0 min-h-[200px]" 
                        placeholder="Write your message here..." 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="bg-muted/20 px-6 py-4 border-t flex items-center justify-between">
              <Button type="button" variant="ghost" size="icon" className="text-muted-foreground">
                <Paperclip className="h-4 w-4" />
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMessage.isPending} className="gap-2">
                  {createMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
