import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CreditCard, CheckCircle2 } from "lucide-react";

interface PayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayModal({ open, onOpenChange }: PayModalProps) {
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClose(v: boolean) {
    if (!v) {
      setTimeout(() => {
        setStep("form");
        setRecipient("");
        setAmount("");
        setCurrency("USD");
        setNote("");
      }, 300);
    }
    onOpenChange(v);
  }

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setStep("confirm");
  }

  function handlePay() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("success");
    }, 1400);
  }

  const formattedAmount = amount
    ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount))
    : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "form" && (
          <form onSubmit={handleReview} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                Send Payment
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pay-recipient">Recipient</Label>
                <Input
                  id="pay-recipient"
                  placeholder="Name or email address"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Amount</Label>
                <div className="flex gap-2">
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD $</SelectItem>
                      <SelectItem value="EUR">EUR €</SelectItem>
                      <SelectItem value="GBP">GBP £</SelectItem>
                      <SelectItem value="CAD">CAD $</SelectItem>
                      <SelectItem value="AUD">AUD $</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="pay-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-note">Note (optional)</Label>
                <Textarea
                  id="pay-note"
                  placeholder="What is this payment for?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <CreditCard className="w-4 h-4" />
                Review Payment
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "confirm" && (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                Confirm Payment
              </DialogTitle>
            </DialogHeader>

            <div className="rounded-xl border bg-muted/30 divide-y text-sm">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-muted-foreground">To</span>
                <span className="font-medium">{recipient}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-emerald-600 text-base">{formattedAmount}</span>
              </div>
              {note && (
                <div className="flex justify-between items-start px-4 py-3 gap-4">
                  <span className="text-muted-foreground shrink-0">Note</span>
                  <span className="text-right">{note}</span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("form")}>
                Back
              </Button>
              <Button
                onClick={handlePay}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[120px]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Send {formattedAmount}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "success" && (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Payment Sent</h2>
              <p className="text-muted-foreground text-sm">
                {formattedAmount} sent to <span className="font-medium text-foreground">{recipient}</span>
              </p>
              {note && <p className="text-xs text-muted-foreground mt-1">"{note}"</p>}
            </div>
            <Button className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
