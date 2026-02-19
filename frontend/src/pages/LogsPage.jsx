import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import './LogsPage.css'
import { get_logs } from '../services/api'

// Custom hook to auto-scroll when last line changes
function useChatScroll(lastLine) {
        const ref = useRef(null);

        useEffect(() => {
            if (ref.current) {
                ref.current.scrollTop = ref.current.scrollHeight;
            }
        }, [lastLine]);

        return ref;
    }


export default function LogsPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [logs, setLogs] = useState([])
    const logEndRef = useRef(null)

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
    const terminalRef = useChatScroll(logs[logs.length - 1]);

 useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await get_logs();
        
        const lastNew = data[data.length - 1];
        const lastCurrent = logs[logs.length - 1];

        if (lastNew !== lastCurrent) {
          setLogs(data);
        }
      } catch (err) {
        console.error("Log fetch failed", err);
      }
    };

    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, [logs]);


    return (
        <div className="app-container">
            <Navbar onToggleSidebar={toggleSidebar} />
            <div className="main-content">
                <Sidebar isOpen={sidebarOpen} />
                <div className={`logs-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
                    <div className="logs-header">
                        <h1>System Logs</h1>
                    </div>
                    <div className="terminal-container" ref={terminalRef}>
                        {logs.map((line, index) => (
                            <div key={index} className={`log-line ${line.includes('WARNING') ? 'warn' : line.includes('ERROR') ? 'err' : ''}`}>
                                <span className="line-number">{index + 1}</span>
                                <span className="line-text">{line}</span>
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </div>
            </div>
        </div>
    )
}