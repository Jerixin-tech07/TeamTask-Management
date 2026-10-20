import React, { useState, useEffect, useRef } from 'react';
import { apiFetch as fetch } from '../api.js';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, Send, Paperclip, Search, X, Download, FileText,
  Image as ImageIcon, Check, CheckCheck, Clock, ShieldCheck
} from 'lucide-react';

export default function ChatView({ initialContact = null, onPreviewFile, onViewProfile }) {
  const { token, user, socket, addToast } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [conversations, setConversations] = useState([]);
  const [activeContact, setActiveContact] = useState(initialContact);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [searchContact, setSearchContact] = useState('');
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch conversations list
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/chat/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
        // Auto-select first contact if none selected
        if (!activeContact && data.conversations.length > 0) {
          setActiveContact(data.conversations[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [token]);

  // Fetch messages when activeContact changes
  const fetchMessages = async (contactId) => {
    if (!contactId) return;
    try {
      const res = await fetch(`/api/chat/messages/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const sorted = (data.messages || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setMessages(sorted);
        // Mark as read
        fetch(`/api/chat/read/${contactId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact.id);
    }
  }, [activeContact?.id]);

  // Real-time socket message handler
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (activeContact && (msg.sender_id === activeContact.id || msg.receiver_id === activeContact.id)) {
        setMessages((prev) => [...prev, msg]);
        fetch(`/api/chat/read/${activeContact.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
      fetchConversations();
    };

    const handleMessageSent = (msg) => {
      if (activeContact && (msg.sender_id === user.id && msg.receiver_id === activeContact.id)) {
        setMessages((prev) => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      fetchConversations();
    };

    const handleTyping = (data) => {
      if (activeContact && data.senderId === activeContact.id) {
        setOtherUserTyping(true);
      }
    };

    const handleStopTyping = (data) => {
      if (activeContact && data.senderId === activeContact.id) {
        setOtherUserTyping(false);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [socket, activeContact?.id, user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  // Typing event emitter
  const handleInputChange = (e) => {
    setNewMessageText(e.target.value);
    if (!socket || !activeContact) return;

    socket.emit('typing', { receiverId: activeContact.id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { receiverId: activeContact.id });
    }, 1500);
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() && !attachment) return;
    if (!activeContact) return;

    setIsSending(true);
    const formData = new FormData();
    formData.append('receiverId', activeContact.id);
    formData.append('content', newMessageText.trim());
    if (attachment) {
      formData.append('attachment', attachment);
    }

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to send message');
      }

      setNewMessageText('');
      setAttachment(null);
      if (socket) {
        socket.emit('stop_typing', { receiverId: activeContact.id });
      }
      fetchMessages(activeContact.id);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchContact.toLowerCase()) ||
    c.email.toLowerCase().includes(searchContact.toLowerCase())
  );

  return (
    <div className="glass-panel" style={{
      height: 'calc(100vh - 120px)',
      display: 'flex',
      overflow: 'hidden',
      borderRadius: 'var(--radius-xl)'
    }}>
      {/* Left Conversations Sidebar (Admin sees all members, User sees Admin) */}
      <div style={{
        width: '320px',
        flexShrink: 0,
        borderRight: '1px solid var(--border-light)',
        background: 'var(--bg-card)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Contact Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px' }}>
            {isAdmin ? 'Direct Support Threads' : 'Administrator Support'}
          </h3>
          {isAdmin && (
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-faint)' }} />
              <input
                type="text"
                placeholder="Search team member..."
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '12px', padding: '6px 32px' }}
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
          {filteredConversations.map((contact) => {
            const isSelected = activeContact?.id === contact.id;
            return (
              <div
                key={contact.id}
                onClick={() => setActiveContact(contact)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                  border: isSelected ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
                  cursor: 'pointer',
                  marginBottom: '4px',
                  transition: 'all 120ms'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={contact.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.name}`}
                    alt={contact.name}
                    style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                  />
                  <span
                    className="status-dot status-dot-active"
                    style={{ position: 'absolute', bottom: 0, right: 0, border: '2px solid var(--bg-card)' }}
                  />
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
                      {contact.name}
                    </span>
                    {contact.unread_count > 0 && (
                      <span className="badge badge-urgent" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        {contact.unread_count}
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: '11px',
                    color: 'var(--text-faint)',
                    margin: '2px 0 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {contact.last_message || contact.department || 'Active in workspace'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Chat Window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
        {activeContact ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-light)',
              background: 'var(--bg-card)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div
                onClick={() => (isAdmin && onViewProfile ? onViewProfile(activeContact) : null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: (isAdmin && onViewProfile) ? 'pointer' : 'default'
                }}
                title={isAdmin && onViewProfile ? `Click to view profile & photo of ${activeContact.name}` : undefined}
              >
                <img
                  src={activeContact.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeContact.name}`}
                  alt={activeContact.name}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
                    {activeContact.name} {isAdmin && <span style={{ fontSize: '10px', color: '#818cf8', fontWeight: 600 }}>(View Profile)</span>}
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                    {activeContact.department} &bull; {activeContact.email}
                  </span>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)'
              }}>
                <ShieldCheck size={13} />
                <span>Private & Encrypted Channel</span>
              </div>
            </div>

            {/* Message Feed - Recent chats are at the bottom upward */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Push content to bottom so messages stack upward */}
              <div style={{ marginTop: 'auto' }} />

              {/* Welcome Message ONLY at the top of the private conversation */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '16px',
                padding: '18px 22px',
                textAlign: 'center',
                marginBottom: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  boxShadow: '0 6px 14px rgba(99, 102, 241, 0.35)',
                  color: '#ffffff'
                }}>
                  <ShieldCheck size={22} />
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
                  Welcome to Private Communication
                </h4>
                <p style={{ margin: '0 auto', fontSize: '12px', color: '#94a3b8', maxWidth: '440px', lineHeight: 1.5 }}>
                  This is a direct 1-on-1 private channel between <strong>{user?.name}</strong> and <strong>{activeContact.name}</strong> ({activeContact.role === 'admin' ? 'Administrator' : (activeContact.department || 'Team Member')}). All messages and files exchanged here are strictly confidential.
                </p>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '10px',
                  fontSize: '11px',
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '3px 10px',
                  borderRadius: '12px'
                }}>
                  <span className="status-dot status-dot-active" />
                  <span>Confidential Channel Active</span>
                </div>
              </div>

              {messages.map((msg) => {
                const isMine = msg.sender_id === user.id;
                const hasAttachment = !!msg.attachment_path;
                const isImageAttachment = msg.attachment_type?.startsWith('image/');

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMine ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      background: isMine
                        ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
                        : 'var(--bg-surface)',
                      color: '#ffffff',
                      border: isMine ? 'none' : '1px solid var(--border-light)',
                      borderRadius: isMine ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      padding: '12px 16px',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      {/* Text content */}
                      {msg.content && (
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {msg.content}
                        </p>
                      )}

                      {/* File attachment preview */}
                      {hasAttachment && (
                        <div style={{
                          marginTop: msg.content ? '10px' : 0,
                          background: 'rgba(0,0,0,0.25)',
                          borderRadius: '8px',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          {isImageAttachment ? (
                            <img
                              src={`/api/files/preview/${msg.id}?token=${token}`}
                              alt={msg.attachment_original_name}
                              style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          ) : (
                            <FileText size={24} style={{ color: '#a5b4fc', flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {msg.attachment_original_name}
                            </p>
                            <span style={{ fontSize: '10px', opacity: 0.8 }}>
                              {(msg.attachment_size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <a
                            href={`/api/files/download/${msg.id}?token=${token}`}
                            download={msg.attachment_original_name}
                            className="btn btn-secondary btn-icon btn-sm"
                            style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.1)' }}
                            title="Download attachment"
                          >
                            <Download size={13} />
                          </a>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMine && (
                        msg.is_read
                          ? <CheckCheck size={13} style={{ color: '#38bdf8' }} title="Read" />
                          : <Check size={13} style={{ color: 'var(--text-faint)' }} title="Delivered" />
                      )}
                    </div>
                  </div>
                );
              })}

              {otherUserTyping && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontSize: '12px' }}>
                  <span className="status-dot status-dot-active" />
                  <span>{activeContact.name} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSendMessage} style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-light)',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {attachment && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-surface)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px'
                }}>
                  <Paperclip size={14} style={{ color: '#818cf8' }} />
                  <span style={{ flex: 1, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary btn-icon"
                  title="Attach file or media"
                >
                  <Paperclip size={18} />
                </button>

                <input
                  type="text"
                  placeholder={`Send private message to ${activeContact.name}...`}
                  className="form-input"
                  value={newMessageText}
                  onChange={handleInputChange}
                  style={{ flex: 1 }}
                />

                <button
                  type="submit"
                  disabled={isSending || (!newMessageText.trim() && !attachment)}
                  className="btn btn-primary btn-icon"
                  style={{ width: '42px', height: '42px' }}
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-faint)' }}>
            <MessageSquare size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600 }}>Select a team member to start private messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
