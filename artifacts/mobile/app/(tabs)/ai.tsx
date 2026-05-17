import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { ComposeModal, type ComposeDraft } from "@/components/ComposeModal";
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useSubscription } from "@/lib/subscription";
import { getAuthToken } from "@/lib/authToken";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

type Provider = "openai" | "claude" | "gemini";

const SUGGESTIONS = [
  "Summarize my unread emails",
  "Draft a reply to my latest email",
  "Translate this to English",
  "What emails did I get today?",
  "Read my latest PDF from storage",
  "Write a professional email for me",
];

function parseEmailDraft(content: string): { before: string; draft: Record<string, string>; after: string } | null {
  const match = content.match(/<email-draft>([\s\S]*?)<\/email-draft>/);
  if (!match) return null;
  const raw = match[1].trim();
  const fields: Record<string, string> = {};

  // Try JSON format first (what the server generates)
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (parsed.to) fields.to = String(parsed.to);
      if (parsed.subject) fields.subject = String(parsed.subject);
      if (parsed.body) fields.body = String(parsed.body);
    }
  } catch {
    // Fall back to XML-style tags
    const fieldRe = /<(to|subject|body)>([\s\S]*?)<\/\1>/gi;
    let m: RegExpExecArray | null;
    while ((m = fieldRe.exec(raw)) !== null) {
      fields[m[1].toLowerCase()] = m[2].trim();
    }
  }

  if (!fields.to && !fields.subject && !fields.body) return null;

  const idx = content.indexOf("<email-draft>");
  const endIdx = content.indexOf("</email-draft>");
  return {
    before: content.slice(0, idx).trim(),
    draft: fields,
    after: content.slice(endIdx + "</email-draft>".length).trim(),
  };
}

function EmailDraftCard({ draft, onSend }: { draft: Record<string, string>; onSend: (d: ComposeDraft) => void }) {
  const colors = useColors();
  const s = makeStyles(colors);
  const [provider, setProvider] = useState<"gmail" | "outlook">("gmail");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSendNow() {
    setSending(true);
    setSendError(null);
    try {
      const token = await getAuthToken();
      const apiUrl = process.env.EXPO_PUBLIC_API_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}/api`
        : process.env.EXPO_PUBLIC_DOMAIN
          ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
          : "/api";
      const res = await fetch(`${apiUrl}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ to: draft.to, subject: draft.subject, body: draft.body, provider }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setSendError((data as any).error ?? "Failed to send");
      }
    } catch {
      setSendError("Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={[s.draftCard, { backgroundColor: colors.card, borderColor: colors.primary + "40" }]}>
      <View style={s.draftHeader}>
        <Feather name="mail" size={14} color={colors.primary} />
        <Text style={[s.draftHeaderText, { color: colors.primary }]}>Email Draft</Text>
      </View>
      {draft.to && (
        <View style={s.draftRow}>
          <Text style={[s.draftLabel, { color: colors.mutedForeground }]}>To:</Text>
          <Text style={[s.draftValue, { color: colors.foreground }]}>{draft.to}</Text>
        </View>
      )}
      {draft.subject && (
        <View style={s.draftRow}>
          <Text style={[s.draftLabel, { color: colors.mutedForeground }]}>Subject:</Text>
          <Text style={[s.draftValue, { color: colors.foreground }]}>{draft.subject}</Text>
        </View>
      )}
      {draft.body && (
        <Text style={[s.draftBody, { color: colors.foreground }]} numberOfLines={4}>{draft.body}</Text>
      )}
      {sent ? (
        <View style={s.draftSentRow}>
          <Feather name="check-circle" size={14} color="#22c55e" />
          <Text style={[s.draftSentText, { color: "#22c55e" }]}>Sent successfully</Text>
        </View>
      ) : (
        <View style={s.draftFooter}>
          <View style={[s.draftProviderRow, { borderColor: colors.border }]}>
            {(["gmail", "outlook"] as const).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setProvider(p)}
                style={[s.draftProviderBtn, provider === p && { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
              >
                <Text style={[s.draftProviderText, { color: provider === p ? "#fff" : colors.mutedForeground }]}>
                  {p === "gmail" ? "Gmail" : "Outlook"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[s.draftSendBtn, { backgroundColor: colors.primary, opacity: sending ? 0.7 : 1 }]}
            onPress={handleSendNow}
            disabled={sending}
            activeOpacity={0.8}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="send" size={13} color="#fff" />}
            <Text style={s.draftSendText}>{sending ? "Sending…" : "Send Now"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.draftEditBtn, { borderColor: colors.border }]}
            onPress={() => onSend({ to: draft.to, subject: draft.subject, body: draft.body })}
            activeOpacity={0.8}
          >
            <Feather name="edit-2" size={13} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}
      {sendError && (
        <Text style={[s.draftErrorText, { color: "#ef4444" }]}>{sendError}</Text>
      )}
    </View>
  );
}

function MessageBubble({ msg, onSendDraft, colors }: { msg: Message; onSendDraft: (d: ComposeDraft) => void; colors: any }) {
  const s = makeStyles(colors);
  if (msg.role === "user") {
    return (
      <View style={[s.bubbleWrap, s.bubbleWrapUser]}>
        <View style={[s.bubble, s.userBubble]}>
          <Text style={s.userText}>{msg.content}</Text>
        </View>
      </View>
    );
  }

  const parsed = parseEmailDraft(msg.content);
  if (parsed) {
    return (
      <View style={[s.bubbleWrap, s.bubbleWrapAssistant]}>
        <View style={s.aiBubbleAvatar}>
          <Feather name="cpu" size={11} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {parsed.before ? (
            <View style={[s.bubble, s.assistantBubble]}>
              <Text style={s.assistantText}>{parsed.before}</Text>
            </View>
          ) : null}
          <EmailDraftCard draft={parsed.draft} onSend={onSendDraft} />
          {parsed.after ? (
            <View style={[s.bubble, s.assistantBubble]}>
              <Text style={s.assistantText}>{parsed.after}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.bubbleWrap, s.bubbleWrapAssistant]}>
      <View style={s.aiBubbleAvatar}>
        <MaterialCommunityIcons name="brain" size={11} color={colors.primary} />
      </View>
      <View style={[s.bubble, s.assistantBubble]}>
        <Text style={s.assistantText}>{msg.content}</Text>
      </View>
    </View>
  );
}

const TAB_BAR_HEIGHT = 49;

export default function AiScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status } = useSubscription();
  const [limitReached, setLimitReached] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const provider: Provider = "openai";
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [composeDraft, setComposeDraft] = useState<ComposeDraft | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [showVoiceGate, setShowVoiceGate] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ name: string; mimeType: string; data: string }>>([]);
  const [showStoragePicker, setShowStoragePicker] = useState(false);
  const [storageFiles, setStorageFiles] = useState<Array<{ id: number; name: string; mimeType: string; sizeBytes: number }>>([]);
  const [storageFilesLoading, setStorageFilesLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const apiUrl = process.env.EXPO_PUBLIC_API_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}/api`
    : process.env.EXPO_PUBLIC_DOMAIN
      ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
      : "/api";

  async function fetchHeaders() {
    const token = await getAuthToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  const loadConversations = useCallback(async () => {
    try {
      const headers = await fetchHeaders();
      const res = await fetch(`${apiUrl}/ai/conversations`, { headers, credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? data ?? []);
      }
    } catch {}
  }, [apiUrl]);

  const startConversation = useCallback(async () => {
    const headers = await fetchHeaders();
    const res = await fetch(`${apiUrl}/ai/conversations`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ title: "New chat" }),
    });
    if (res.ok) {
      const conv = await res.json();
      setConversation(conv);
      setMessages([]);
      loadConversations();
    }
  }, [apiUrl, loadConversations]);

  async function loadConversation(conv: Conversation) {
    setConversation(conv);
    setSidebarVisible(false);
    try {
      const headers = await fetchHeaders();
      const res = await fetch(`${apiUrl}/ai/conversations/${conv.id}`, { headers, credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(
          (data.messages ?? []).map((m: any) => ({ role: m.role, content: m.content }))
        );
      }
    } catch {}
  }

  async function deleteConversation(conv: Conversation) {
    Alert.alert("Delete conversation", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const headers = await fetchHeaders();
            await fetch(`${apiUrl}/ai/conversations/${conv.id}`, { method: "DELETE", headers, credentials: "include" });
            if (conversation?.id === conv.id) {
              setConversation(null);
              setMessages([]);
            }
            loadConversations();
          } catch {}
        },
      },
    ]);
  }

  useEffect(() => {
    loadConversations();
    if (!conversation) startConversation();
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  async function pickAttachmentFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      const MAX_BYTES = 8 * 1024 * 1024;
      if (asset.size && asset.size > MAX_BYTES) {
        Alert.alert("File too large", "Please attach a file smaller than 8 MB.");
        return;
      }

      let base64 = "";
      try {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: "base64" as const,
        });
      } catch {
        Alert.alert("Could not read file", "The file could not be read. Try a different file.");
        return;
      }

      setPendingAttachments((prev) => [
        ...prev,
        { name: asset.name, mimeType: asset.mimeType ?? "application/octet-stream", data: base64 },
      ]);
    } catch (err: any) {
      if (err?.code !== "DOCUMENT_PICKER_CANCELED") {
        Alert.alert("Error", "Could not open file picker. Please try again.");
      }
    }
  }

  async function pickAttachmentPhoto() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow photo library access in Settings to attach images.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        base64: true,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("Could not read photo", "Unable to read the selected photo. Try a different one.");
        return;
      }
      const mimeType = asset.mimeType ?? "image/jpeg";
      const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`;
      setPendingAttachments((prev) => [
        ...prev,
        { name: fileName, mimeType, data: asset.base64! },
      ]);
    } catch {
      Alert.alert("Error", "Could not open photo picker. Please try again.");
    }
  }

  function pickAttachment() {
    Alert.alert("Attach", "What would you like to attach?", [
      { text: "File / PDF", onPress: pickAttachmentFile },
      { text: "Photo from Library", onPress: pickAttachmentPhoto },
      { text: "PinnboxIO Storage", onPress: () => { loadStorageFiles(); setShowStoragePicker(true); } },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function loadStorageFiles() {
    setStorageFilesLoading(true);
    try {
      const headers = await fetchHeaders();
      const res = await fetch(`${apiUrl}/storage/files`, { headers, credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStorageFiles(data.files ?? []);
      }
    } catch {}
    setStorageFilesLoading(false);
  }

  async function pickStorageFile(file: { id: number; name: string; mimeType: string }) {
    setShowStoragePicker(false);
    try {
      const headers = await fetchHeaders();
      const urlRes = await fetch(`${apiUrl}/storage/files/${file.id}/download-url`, { headers, credentials: "include" });
      if (!urlRes.ok) {
        Alert.alert("Error", "Could not access this file. Please try again.");
        return;
      }
      const { downloadUrl } = await urlRes.json();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const dest = (FileSystem.cacheDirectory ?? "") + safeName;
      const downloaded = await FileSystem.downloadAsync(downloadUrl, dest);
      const base64 = await FileSystem.readAsStringAsync(downloaded.uri, { encoding: "base64" as const });
      setPendingAttachments((prev) => [...prev, { name: file.name, mimeType: file.mimeType, data: base64 }]);
    } catch {
      Alert.alert("Error", "Could not attach this file. Please try again.");
    }
  }

  async function startVoiceRecording() {
    if (status?.plan === "free") {
      setShowVoiceGate(true);
      return;
    }
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert("Microphone permission required", "Please allow microphone access in your device settings to use voice input.");
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch {
      Alert.alert("Could not start recording", "Please try again.");
    }
  }

  async function stopVoiceRecording() {
    if (!isRecording) return;
    setIsRecording(false);
    setTranscribing(true);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) { setTranscribing(false); return; }

      const formData = new FormData();
      formData.append("audio", { uri, name: "recording.m4a", type: "audio/m4a" } as any);

      const token = await getAuthToken();
      const res = await fetch(`${apiUrl}/ai/transcribe`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setInput((prev) => (prev ? prev + " " + data.text : data.text));
        }
      } else {
        Alert.alert("Transcription failed", "Could not convert your speech. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Something went wrong with voice input.");
    } finally {
      setTranscribing(false);
    }
  }

  const sendMessage = async (text?: string) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg || streaming) return;

    // Auto-create a conversation if none exists
    let activeConversation = conversation;
    if (!activeConversation) {
      try {
        const headers = await fetchHeaders();
        const res = await fetch(`${apiUrl}/ai/conversations`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ title: "New chat" }),
        });
        if (res.ok) {
          activeConversation = await res.json();
          setConversation(activeConversation);
          loadConversations();
        }
      } catch {}
    }
    if (!activeConversation) return;

    const attachmentsToSend = [...pendingAttachments];
    setInput("");
    setPendingAttachments([]);
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);

    let assistantContent = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const headers = await fetchHeaders();
      const res = await fetch(`${apiUrl}/ai/conversations/${activeConversation.id}/messages`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ content: userMsg, provider, attachments: attachmentsToSend }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        if (res.status === 402 || (error as any)?.error === "AI_DAILY_LIMIT_REACHED") {
          setLimitReached(true);
          setMessages((prev) => prev.slice(0, -1));
          setStreaming(false);
          return;
        }
        throw new Error((error as any)?.error || "Sorry, something went wrong. Please try again.");
      }

      function parseSseChunk(chunk: string) {
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantContent += data.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }

      if (Platform.OS === "web" && res.body) {
        // Web: true streaming SSE with line-buffered decoder for multi-byte chars
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";
          parseSseChunk(lines.join("\n") + "\n");
        }
      } else {
        // Native (iOS/Android): Hermes fetch doesn't support SSE streaming,
        // read the full response text then parse all SSE events at once
        const text = await res.text();
        parseSseChunk(text);
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: err instanceof Error ? err.message : "Sorry, something went wrong.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      loadConversations();
      // Delayed refresh so auto-generated title (set async on server) appears
      setTimeout(() => loadConversations(), 1500);
    }
  };

  useEffect(() => {
    if (messages.length > 0) scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  function openSendDraft(draft: ComposeDraft) {
    setComposeDraft(draft);
    setComposeVisible(true);
  }

  const bottomPad = insets.bottom + TAB_BAR_HEIGHT;
  const s = makeStyles(colors, bottomPad);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.sidebarBtn} onPress={() => { loadConversations(); setSidebarVisible(true); }}>
          <Feather name="list" size={20} color={colors.primary} />
        </Pressable>
        <View style={s.headerIcon}>
          <MaterialCommunityIcons name="brain" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{conversation?.title ?? "AI Assistant"}</Text>
          <Text style={s.headerSub}>Context-aware help for your inbox</Text>
        </View>
        <TouchableOpacity style={s.newBtn} onPress={startConversation} activeOpacity={0.8}>
          <Feather name="plus" size={15} color={colors.primary} />
        </TouchableOpacity>
      </View>


      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[s.scrollContent, messages.length === 0 && s.scrollEmpty]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIconWrap}>
                <MaterialCommunityIcons name="brain" size={30} color={colors.primary} />
              </View>
              <Text style={s.emptyTitle}>Hello! I'm your AI assistant.</Text>
              <Text style={s.emptyText}>I can summarize emails, draft replies, find contacts, and help you manage all your communications smarter.</Text>
              <View style={s.suggestionsGrid}>
                {SUGGESTIONS.map((suggestion) => (
                  <TouchableOpacity key={suggestion} style={s.suggestion} onPress={() => sendMessage(suggestion)} activeOpacity={0.75}>
                    <Text style={s.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} onSendDraft={openSendDraft} colors={colors} />
            ))
          )}
          {streaming && messages[messages.length - 1]?.content === "" && (
            <View style={[s.bubbleWrap, s.bubbleWrapAssistant]}>
              <View style={s.aiBubbleAvatar}><MaterialCommunityIcons name="brain" size={11} color={colors.primary} /></View>
              <View style={[s.bubble, s.assistantBubble]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {pendingAttachments.length > 0 && (
          <View style={[s.attachPreviewBar, { borderTopColor: colors.border }]}>
            {pendingAttachments.map((att, i) => (
              <View key={i} style={[s.attachChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name={att.mimeType.startsWith("image/") ? "image" : "file"} size={12} color={colors.primary} />
                <Text style={[s.attachChipText, { color: colors.foreground }]} numberOfLines={1}>{att.name}</Text>
                <TouchableOpacity onPress={() => setPendingAttachments((p) => p.filter((_, j) => j !== i))} hitSlop={8}>
                  <Feather name="x" size={12} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {limitReached && (
          <View style={[s.limitBanner, { backgroundColor: "#fef3c7", borderColor: "#f59e0b40" }]}>
            <Feather name="alert-circle" size={16} color="#d97706" />
            <View style={{ flex: 1 }}>
              <Text style={[s.limitBannerText, { color: "#92400e" }]}>
                You've used all 20 free AI queries today
              </Text>
              <Text style={[s.limitBannerSub, { color: "#b45309" }]}>Resets at midnight</Text>
            </View>
            <Pressable
              style={[s.limitUpgradeBtn, { backgroundColor: "#d97706" }]}
              onPress={() => router.push("/paywall" as any)}
            >
              <Text style={s.limitUpgradeBtnText}>Upgrade to Pro</Text>
            </Pressable>
          </View>
        )}

        <View style={s.inputBar}>
          <TouchableOpacity
            style={s.attachBtn}
            onPress={pickAttachment}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.micBtn}
            onPress={() => {
              setInput((prev) =>
                prev
                  ? `Translate the following text and detect the language automatically, then provide the translation in English:\n\n${prev}`
                  : "Translate this text for me — paste it below and tell me the target language:"
              );
            }}
            activeOpacity={0.7}
          >
            <Feather name="globe" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.micBtn, isRecording && { backgroundColor: "#ef444420" }]}
            onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={transcribing || streaming}
            activeOpacity={0.8}
          >
            {transcribing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
                <Feather
                  name="mic"
                  size={18}
                  color={isRecording ? "#ef4444" : colors.mutedForeground}
                />
              </Animated.View>
            )}
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={isRecording ? "Listening…" : "Ask anything about your communications…"}
            placeholderTextColor={isRecording ? "#ef4444" : colors.mutedForeground}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
            editable={!isRecording}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || streaming) && s.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || streaming}
            activeOpacity={0.8}
          >
            {streaming ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Storage file picker */}
      <Modal visible={showStoragePicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowStoragePicker(false)}>
        <SafeAreaView style={[s.sidebarModal, { backgroundColor: colors.background }]} edges={["top"]}>
          <View style={[s.sidebarHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.sidebarTitle, { color: colors.foreground }]}>My Drive</Text>
            <Pressable onPress={() => setShowStoragePicker(false)} style={s.sidebarClose}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          {storageFilesLoading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : storageFiles.length === 0 ? (
            <View style={s.sidebarEmpty}>
              <Feather name="hard-drive" size={36} color={colors.mutedForeground} />
              <Text style={[s.sidebarEmptyText, { color: colors.mutedForeground }]}>No files in storage</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {storageFiles.map((file) => (
                <Pressable
                  key={file.id}
                  style={[s.convRow, { borderBottomColor: colors.border }]}
                  onPress={() => pickStorageFile(file)}
                >
                  <Feather
                    name={file.mimeType.startsWith("image/") ? "image" : file.mimeType.includes("pdf") ? "file-text" : "file"}
                    size={18}
                    color={colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.convTitle, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                      {(file.sizeBytes / 1024).toFixed(0)} KB
                    </Text>
                  </View>
                  <Feather name="paperclip" size={14} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Conversation sidebar */}
      <Modal visible={sidebarVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSidebarVisible(false)}>
        <SafeAreaView style={[s.sidebarModal, { backgroundColor: colors.background }]} edges={["top"]}>
          <View style={[s.sidebarHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.sidebarTitle, { color: colors.foreground }]}>Conversations</Text>
            <Pressable onPress={() => setSidebarVisible(false)} style={s.sidebarClose}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <Pressable
            style={[s.newConvBtn, { backgroundColor: colors.primary }]}
            onPress={() => { startConversation(); setSidebarVisible(false); }}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={s.newConvBtnText}>New Conversation</Text>
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false}>
            {conversations.length === 0 ? (
              <View style={s.sidebarEmpty}>
                <Feather name="message-circle" size={36} color={colors.mutedForeground} />
                <Text style={[s.sidebarEmptyText, { color: colors.mutedForeground }]}>No conversations yet</Text>
              </View>
            ) : (
              conversations.map((conv) => (
                <Pressable
                  key={conv.id}
                  style={[
                    s.convRow,
                    { borderBottomColor: colors.border },
                    conv.id === conversation?.id && { backgroundColor: colors.primary + "10" },
                  ]}
                  onPress={() => loadConversation(conv)}
                >
                  <Feather name="message-square" size={16} color={conv.id === conversation?.id ? colors.primary : colors.mutedForeground} />
                  <Text style={[s.convTitle, { color: conv.id === conversation?.id ? colors.primary : colors.foreground }]} numberOfLines={1}>
                    {conv.title}
                  </Text>
                  <Pressable onPress={() => deleteConversation(conv)} hitSlop={8}>
                    <Feather name="trash-2" size={15} color={colors.mutedForeground} />
                  </Pressable>
                </Pressable>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <ComposeModal visible={composeVisible} onClose={() => setComposeVisible(false)} initialDraft={composeDraft} />

      {/* Voice-to-email Pro gate bottom sheet */}
      <Modal visible={showVoiceGate} transparent animationType="slide" onRequestClose={() => setShowVoiceGate(false)}>
        <Pressable style={s.gateOverlay} onPress={() => setShowVoiceGate(false)}>
          <Pressable style={[s.gateSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={s.gateHandle} />
            <View style={[s.gateIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Text style={s.gateMicEmoji}>🎙</Text>
            </View>
            <Text style={[s.gateTitle, { color: colors.foreground }]}>Voice to Email is a Pro feature</Text>
            <Text style={[s.gateDesc, { color: colors.mutedForeground }]}>
              Dictate emails hands-free with AI transcription.
            </Text>
            <TouchableOpacity
              style={[s.gateUpgradeBtn, { backgroundColor: colors.primary }]}
              onPress={() => { setShowVoiceGate(false); router.push("/paywall" as any); }}
              activeOpacity={0.85}
            >
              <Text style={s.gateUpgradeBtnText}>Upgrade to Pro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.gateDismissBtn, { borderColor: colors.border }]}
              onPress={() => setShowVoiceGate(false)}
              activeOpacity={0.7}
            >
              <Text style={[s.gateDismissBtnText, { color: colors.mutedForeground }]}>Maybe later</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: any, bottomPad = 0) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    sidebarBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" },
    headerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground },
    headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 },
    newBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" },
    providerBar: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    providerPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.muted },
    providerPillActive: { backgroundColor: colors.primary },
    providerPillText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    providerPillTextActive: { color: "#fff" },
    scrollContent: { padding: 16, paddingBottom: 12 },
    scrollEmpty: { flexGrow: 1 },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    emptyIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center", marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center", marginBottom: 8 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 21, marginBottom: 24 },
    suggestionsGrid: { width: "100%", gap: 10 },
    suggestion: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13 },
    suggestionText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground },
    bubbleWrap: { flexDirection: "row", marginBottom: 14, gap: 8 },
    bubbleWrapUser: { justifyContent: "flex-end" },
    bubbleWrapAssistant: { justifyContent: "flex-start", alignItems: "flex-start" },
    aiBubbleAvatar: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center", marginTop: 2, flexShrink: 0 },
    bubble: { maxWidth: "82%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
    assistantBubble: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderBottomLeftRadius: 5 },
    userText: { color: "#fff", fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
    assistantText: { color: colors.foreground, fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
    limitBanner: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, flexWrap: "wrap" },
    limitBannerText: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
    limitBannerSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
    limitUpgradeBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
    limitUpgradeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
    gateOverlay: { flex: 1, backgroundColor: "#00000060", justifyContent: "flex-end" },
    gateSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, alignItems: "center", gap: 12 },
    gateHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#d1d5db", marginBottom: 8 },
    gateIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    gateMicEmoji: { fontSize: 30 },
    gateTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
    gateDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, maxWidth: 280 },
    gateUpgradeBtn: { width: "100%", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 8 },
    gateUpgradeBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
    gateDismissBtn: { width: "100%", borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 14, alignItems: "center" },
    gateDismissBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
    inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 + bottomPad, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    attachBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    micBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    input: { flex: 1, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, color: colors.foreground, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 120 },
    sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    sendBtnDisabled: { backgroundColor: colors.muted },
    sidebarModal: { flex: 1 },
    sidebarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    sidebarTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
    sidebarClose: { padding: 4 },
    newConvBtn: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
    newConvBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
    sidebarEmpty: { alignItems: "center", paddingTop: 60, gap: 12 },
    sidebarEmptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
    convRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    convTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
    draftCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8, maxWidth: "100%" },
    draftHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
    draftHeaderText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    draftRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
    draftLabel: { fontSize: 12, fontFamily: "Inter_500Medium", width: 50, flexShrink: 0 },
    draftValue: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
    draftBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginTop: 4 },
    draftFooter: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 },
    draftProviderRow: { flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, overflow: "hidden" },
    draftProviderBtn: { paddingHorizontal: 10, paddingVertical: 5 },
    draftProviderText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    draftSendBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    draftSendText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
    draftEditBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
    draftSentRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4 },
    draftSentText: { fontSize: 12, fontFamily: "Inter_500Medium" },
    draftErrorText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    attachPreviewBar: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
    attachChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, maxWidth: 200 },
    attachChipText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  });
}
