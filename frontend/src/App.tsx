import { useState, useEffect } from 'react'
import { FileText, Paperclip, Send, Save, Download, Settings, Trash2, Plus, LogOut } from 'lucide-react'
import { useMsal, useIsAuthenticated } from "@azure/msal-react"
import LoginPage from './LoginPage'

// Definizione Tipi per l'Offerta
interface LineItem {
  id?: string;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface OfferData {
  id?: number;
  offerCode?: string;
  customerName: string;
  projectName: string;
  items: LineItem[];
  notes: string;
}

interface HistoryItem {
  id: number;
  offerCode: string | null;
  customerName: string;
  projectName: string;
  createdAt: string;
}

function App() {
  const { instance, accounts } = useMsal();
  const isMsalAuthenticated = useIsAuthenticated();
  
  // Auth state per login locale o entra id
  const [localToken, setLocalToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("Mario Rossi (Vendite)");

  const isAuthenticated = isMsalAuthenticated || localToken !== null;

  useEffect(() => {
      if (isMsalAuthenticated && accounts.length > 0) {
          setUsername(accounts[0].name || accounts[0].username);
      }
  }, [isMsalAuthenticated, accounts]);

  const handleLogout = () => {
      if (isMsalAuthenticated) {
          instance.logoutPopup();
      } else {
          setLocalToken(null);
      }
  }

  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  
  // Stato dell'offerta corrente
  const [offer, setOffer] = useState<OfferData | null>(null)

  // Fetch History on Load
  useEffect(() => {
      if (isAuthenticated) {
          fetchHistory();
      }
  }, [isAuthenticated]);

  const fetchHistory = async () => {
      try {
          const res = await fetch('http://localhost:8000/api/offers/history');
          const data = await res.json();
          setHistory(data);
      } catch(e) {
          console.error("Errore fetch history", e);
      }
  }

  const loadOffer = async (id: number) => {
      try {
          const res = await fetch(`http://localhost:8000/api/offers/${id}`);
          const data = await res.json();
          setOffer(data);
          // Aggiungiamo un messaggio per far capire all'utente
          setMessages([{role: 'assistant', content: `Ho caricato l'offerta per il progetto "${data.projectName}".`}]);
      } catch(e) {
          console.error("Errore load offer", e);
      }
  }

  const saveOffer = async () => {
      if (!offer) return;
      try {
          const res = await fetch('http://localhost:8000/api/offers/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(offer)
          });
          const savedData = await res.json();
          setOffer(savedData); // Update with ID
          fetchHistory(); // Refresh sidebar
          alert("Offerta salvata con successo nel DB!");
      } catch (e) {
          alert("Errore durante il salvataggio.");
      }
  }

  const exportCrm = async () => {
      if (!offer || !offer.id) {
          alert("Devi prima salvare l'offerta nel DB.");
          return;
      }
      if (!offer.offerCode) {
          alert("Devi compilare il 'Codice Offerta' per poter esportare al CRM.");
          return;
      }
      try {
          const res = await fetch(`http://localhost:8000/api/offers/${offer.id}/export`, {
              method: 'POST'
          });
          const data = await res.json();
          if (res.ok) {
              alert(data.message);
          } else {
              alert("Errore: " + data.detail);
          }
      } catch (e) {
          alert("Errore durante l'esportazione.");
      }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content })
      })
      const data = await response.json()
      
      const replyText = data.reply || "Ecco l'offerta richiesta:";
      setMessages(prev => [...prev, { role: 'assistant', content: replyText }])

      // Ora il backend FastAPI con Pydantic restituisce l'offerta già parsata come oggetto JSON nativo!
      if (data.offer) {
          // Assicuriamoci che items esista sempre per evitare crash nel render (es. map)
          const safeOffer = {
            ...data.offer,
            items: data.offer.items || []
          };
          setOffer(safeOffer);
      } else {
          // Fallback legacy/mock
          extractAndSetOffer(replyText);
      }

    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Errore di connessione col server.' }])
    } finally {
      setIsLoading(false)
    }
  }

  // Funzione che tenta di trovare un JSON nell'output dell'LLM (o usa un mock per demo)
  const extractAndSetOffer = (text: string) => {
    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.items) {
          setOffer(parsed);
          return;
        }
      }
      
      // MOCK per Demo se menziona la parola 'generato' o 'preventivo' o 'forno'
      if (text.toLowerCase().includes('forno') || text.toLowerCase().includes('preventivo') || text.toLowerCase().includes('offerta')) {
        setOffer({
            customerName: "Azienda Ceramica XYZ SpA",
            projectName: "Nuova Linea di Cottura - Forno a Rulli",
            notes: "Preventivo elaborato sulla base del capitolato tecnico. Inclusi motori 480V/60Hz come richiesto dalle specifiche USA allegate.",
            items: [
                { id: '1', code: 'FR-400-BASE', description: 'Modulo Base Forno a Rulli 400mm', quantity: 1, unitPrice: 45000, discount: 10 },
                { id: '2', code: 'MOT-480-60', description: 'Motore Elettrico 480V 60Hz (Mercato USA)', quantity: 12, unitPrice: 1200, discount: 5 },
                { id: '3', code: 'QUAD-ELET-UL', description: 'Quadro Elettrico certificato UL/CSA', quantity: 1, unitPrice: 18500, discount: 0 },
                { id: '4', code: 'SRV-INSTALL', description: 'Servizio di Installazione e Collaudo (Giornate)', quantity: 5, unitPrice: 850, discount: 0 },
            ]
        })
      }
    } catch (e) {
      console.error("Errore nel parsing dell'offerta", e)
    }
  }

  // Funzioni helper per la tabella
  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    if (!offer) return;
    const newItems = [...offer.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setOffer({ ...offer, items: newItems });
  }

  const calculateRowTotal = (item: LineItem) => {
    const total = item.quantity * item.unitPrice;
    const discountAmount = total * (item.discount / 100);
    return total - discountAmount;
  }

  const calculateGrandTotal = () => {
    if (!offer || !offer.items) return 0;
    return offer.items.reduce((acc, item) => acc + calculateRowTotal(item), 0);
  }

  // Se l'utente non è loggato, mostra la pagina di Login
  if (!isAuthenticated) {
      return (
          <LoginPage 
              onLocalLogin={(token, name) => {
                  setLocalToken(token);
                  setUsername(name);
              }} 
          />
      );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <div className="w-16 md:w-64 bg-slate-900 text-slate-300 p-4 flex flex-col transition-all duration-300">
        <div className="flex items-center mb-8">
            <div className="bg-blue-600 p-2 rounded-lg text-white mr-3">
                <FileText size={24} />
            </div>
            <h1 className="text-xl font-bold text-white hidden md:block">Sales AI</h1>
        </div>
        
        <div className="flex-1 hidden md:block overflow-y-auto">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-semibold">Storico</p>
          <ul className="space-y-3 text-sm">
            {history.length === 0 ? (
                <li className="text-slate-600 italic">Nessuna offerta salvata.</li>
            ) : (
                history.map((h) => (
                    <li key={h.id} onClick={() => loadOffer(h.id)} className="cursor-pointer hover:text-white flex flex-col mb-2 group">
                        <div className="flex items-center text-slate-300 group-hover:text-white">
                            <FileText size={16} className="mr-2 text-slate-500 group-hover:text-blue-400"/> 
                            <span className="truncate" title={h.projectName}>{h.projectName}</span>
                        </div>
                        <div className="text-xs text-slate-600 ml-6 mt-1">
                            {h.offerCode || 'Senza Codice'} - {h.customerName}
                        </div>
                    </li>
                ))
            )}
          </ul>
        </div>

        <div className="mt-auto hidden md:block">
          <div className="border-t border-slate-700 pt-4 mb-4">
            <button className="flex items-center text-sm hover:text-white w-full py-2">
               <Settings size={18} className="mr-3 text-slate-500" /> Impostazioni LLM
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <div className="h-16 border-b bg-white flex items-center px-6 justify-between shrink-0 shadow-sm z-10">
          <h2 className="font-semibold text-lg text-slate-800">Area Lavoro: Nuova Offerta</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-600 hidden md:inline">{username}</span>
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white">
                {username.substring(0,2).toUpperCase()}
            </div>
            <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                title="Logout"
            >
                <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Chat Interface */}
          <div className="w-full lg:w-5/12 xl:w-1/3 flex flex-col bg-white border-r border-slate-200 z-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-slate-500 h-full px-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                      <Settings size={32} />
                  </div>
                  <p className="font-medium text-slate-700">Come posso aiutarti oggi?</p>
                  <p className="text-sm mt-2 text-slate-500">
                    Es: "Preparami un'offerta per un forno a rulli per l'azienda XYZ, basandoti sulla vecchia offerta USA."
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                      {msg.role === 'assistant' ? (
                          <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                      ) : (
                          msg.content
                      )}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-sm flex items-center space-x-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex items-center space-x-2 bg-slate-100 rounded-xl p-1 border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <label className="cursor-pointer text-slate-400 hover:text-blue-600 p-2 rounded-lg transition-colors">
                  <Paperclip size={20} />
                  <input type="file" className="hidden" />
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Chiedi all'AI o allega capitolato..."
                  className="flex-1 bg-transparent px-2 py-2 focus:outline-none text-sm text-slate-700"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Offer Preview Pane */}
          <div className="flex-1 bg-slate-50 overflow-y-auto">
            {offer ? (
                <div className="max-w-4xl mx-auto py-8 px-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-slate-800">Distinta d'Offerta</h3>
                        <div className="flex space-x-3">
                            <button onClick={saveOffer} className="flex items-center text-sm font-medium text-slate-600 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                                <Save size={16} className="mr-2" /> Salva in SQL
                            </button>
                            <button onClick={exportCrm} className="flex items-center text-sm font-medium text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                <Download size={16} className="mr-2" /> Esporta per CRM
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Header Offerta */}
                        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                            <div className="grid grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Codice Offerta</label>
                                    <input 
                                        type="text" 
                                        placeholder="Inserisci Codice CRM..."
                                        value={offer.offerCode || ''}
                                        onChange={(e) => setOffer({...offer, offerCode: e.target.value})}
                                        className="w-full text-lg font-semibold text-slate-800 bg-white border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors px-2 py-1 shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Cliente</label>
                                    <input 
                                        type="text" 
                                        value={offer.customerName}
                                        onChange={(e) => setOffer({...offer, customerName: e.target.value})}
                                        className="w-full text-lg font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors px-1 py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Progetto</label>
                                    <input 
                                        type="text" 
                                        value={offer.projectName}
                                        onChange={(e) => setOffer({...offer, projectName: e.target.value})}
                                        className="w-full text-lg font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors px-1 py-1"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tabella Componenti */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3">Codice</th>
                                        <th className="px-6 py-3">Descrizione Componente</th>
                                        <th className="px-6 py-3 w-24 text-right">Q.tà</th>
                                        <th className="px-6 py-3 w-32 text-right">Prezzo Unit. (€)</th>
                                        <th className="px-6 py-3 w-24 text-right">Sconto %</th>
                                        <th className="px-6 py-3 w-32 text-right">Totale (€)</th>
                                        <th className="px-4 py-3 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {offer.items && offer.items.map((item, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 group transition-colors">
                                            <td className="px-6 py-3 font-medium text-slate-800">
                                                {item.code}
                                            </td>
                                            <td className="px-6 py-3">
                                                <input 
                                                    className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <input 
                                                    type="number"
                                                    className="w-full text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <input 
                                                    type="number"
                                                    className="w-full text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1"
                                                    value={item.unitPrice}
                                                    onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <input 
                                                    type="number"
                                                    className="w-full text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1"
                                                    value={item.discount}
                                                    onChange={(e) => handleItemChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="px-6 py-3 text-right font-semibold text-slate-700">
                                                {calculateRowTotal(item).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer & Totals */}
                        <div className="p-6 bg-slate-50 flex justify-between items-start">
                            <div className="w-1/2">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Note Commerciali</label>
                                <textarea 
                                    className="w-full h-24 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-3 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none"
                                    value={offer.notes}
                                    onChange={(e) => setOffer({...offer, notes: e.target.value})}
                                ></textarea>
                                <button className="mt-3 text-sm text-blue-600 font-medium flex items-center hover:text-blue-800 transition-colors">
                                    <Plus size={16} className="mr-1" /> Aggiungi Riga Manuale
                                </button>
                            </div>
                            <div className="w-1/3 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-500">Imponibile</span>
                                    <span className="font-medium text-slate-700">€ {calculateGrandTotal().toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-slate-500">IVA (22%)</span>
                                    <span className="font-medium text-slate-700">€ {(calculateGrandTotal() * 0.22).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                                    <span className="text-lg font-bold text-slate-800">Totale</span>
                                    <span className="text-xl font-bold text-blue-600">€ {(calculateGrandTotal() * 1.22).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <FileText size={64} className="text-slate-200 mb-4" />
                    <p className="text-lg font-medium text-slate-500">Nessuna offerta in lavorazione</p>
                    <p className="text-sm mt-2 max-w-md text-center">Inizia la conversazione con l'AI o seleziona un'offerta dallo storico per visualizzare l'anteprima della distinta base.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
