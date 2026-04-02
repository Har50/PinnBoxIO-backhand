import { useGetAccounts, useDeleteAccount, useCreateAccount } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Plus, Trash2, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Accounts() {
  const { data: accounts, isLoading, refetch } = useGetAccounts();
  const deleteAccount = useDeleteAccount();
  const createAccount = useCreateAccount();
  const { toast } = useToast();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: "", email: "", provider: "gmail", color: "#0ea5e9" });

  const handleDelete = (id: number) => {
    deleteAccount.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Account removed successfully" });
        refetch();
      }
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createAccount.mutate({ data: newAcc as any }, {
      onSuccess: () => {
        toast({ title: "Account added successfully" });
        setIsAddOpen(false);
        setNewAcc({ name: "", email: "", provider: "gmail", color: "#0ea5e9" });
        refetch();
      }
    });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Connected Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage email accounts synced to your workspace.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Email Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select value={newAcc.provider} onValueChange={(v) => setNewAcc({...newAcc, provider: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook</SelectItem>
                    <SelectItem value="yahoo">Yahoo</SelectItem>
                    <SelectItem value="imap">IMAP Custom</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" required value={newAcc.name} onChange={e => setNewAcc({...newAcc, name: e.target.value})} placeholder="e.g. Work Email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" required value={newAcc.email} onChange={e => setNewAcc({...newAcc, email: e.target.value})} placeholder="me@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Label Color</Label>
                <div className="flex items-center gap-3">
                  <Input id="color" type="color" required value={newAcc.color} onChange={e => setNewAcc({...newAcc, color: e.target.value})} className="w-12 h-10 p-1 cursor-pointer" />
                  <span className="text-sm text-muted-foreground uppercase">{newAcc.color}</span>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createAccount.isPending}>Connect Account</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)
        ) : accounts?.length === 0 ? (
          <div className="col-span-full p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground">
            <Mail className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="font-medium text-lg text-foreground mb-1">No accounts connected</h3>
            <p className="text-sm mb-4">Connect an email account to start receiving messages.</p>
            <Button variant="outline" onClick={() => setIsAddOpen(true)}>Add Account</Button>
          </div>
        ) : (
          accounts?.map(acc => (
            <Card key={acc.id} className="relative overflow-hidden group hover:border-primary/30 transition-colors shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: acc.color || "var(--primary)" }} />
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border shadow-sm">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{acc.name}</CardTitle>
                      <CardDescription className="text-xs font-medium">{acc.provider.toUpperCase()}</CardDescription>
                    </div>
                  </div>
                  {acc.isActive ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                      <AlertCircle className="w-3 h-3" /> Issue
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-4 space-y-4">
                <div>
                  <div className="text-sm font-medium">{acc.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">Connected on {format(new Date(acc.createdAt), "MMM d, yyyy")}</div>
                </div>
                
                <div className="bg-muted/40 rounded-md p-3 flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">Unread Messages</div>
                  <div className="font-semibold">{acc.unreadCount}</div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between border-t p-4 bg-muted/10">
                <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground hover:text-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Re-sync
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs h-8 text-destructive hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(acc.id)}
                  disabled={deleteAccount.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Disconnect
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
