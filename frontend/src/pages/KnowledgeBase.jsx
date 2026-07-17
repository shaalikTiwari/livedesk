import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Sparkles } from "lucide-react";

function KnowledgeBase() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem("livedesk_token");
  const business = JSON.parse(localStorage.getItem("livedesk_business") || "null");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetch(`${import.meta.env.VITE_SOCKET_URL}/api/business/knowledge-base`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setText(data.knowledgeBase || "");
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading knowledge base:", err);
        setLoading(false);
      });
  }, [token, navigate]);

  const handleSave = () => {
    setSaving(true);
    setSaved(false);

    fetch(`${import.meta.env.VITE_SOCKET_URL}/api/business/knowledge-base`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ knowledgeBase: text }),
    })
      .then((res) => res.json())
      .then(() => {
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch((err) => {
        console.error("Error saving knowledge base:", err);
        setSaving(false);
      });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-purple-500" />
          <h1 className="text-xl font-semibold text-slate-900">AI Knowledge Base</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Tell the AI assistant about <strong>{business?.name || "your business"}</strong> — what
          you offer, your hours, policies, pricing, anything customers commonly ask. The AI will
          only answer using what you write here, and will connect customers to a real team member
          for anything else.
        </p>

        {loading ? (
          <div className="text-sm text-slate-400">Loading...</div>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Example:\n\nWe are a small online candle shop. We sell hand-poured soy candles in 8 scents, priced $18-$28.\nBusiness hours: Mon-Fri, 9am-5pm EST.\nFree shipping on orders over $50 within the US.\nReturns accepted within 30 days if unused.`}
              rows={16}
              className="w-full border border-slate-200 rounded-xl p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save size={15} />
                {saving ? "Saving..." : "Save"}
              </button>
              {saved && <span className="text-sm text-green-600">Saved</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default KnowledgeBase;