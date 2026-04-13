import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function TimerDisplay({ endDate }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(endDate) - new Date();
      if (diff <= 0) {
        setTimeLeft('Voting has ended');
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000*60*60*24));
        const hours = Math.floor((diff % (86400000)) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        let parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0 || days > 0) parts.push(`${hours}h`);
        if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);
        setTimeLeft(parts.join(' '));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endDate]);
  return <strong>⏰ Poll ends in: {timeLeft}</strong>;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [view, setView] = useState(token ? 'poll' : 'login');
  const [poll, setPoll] = useState(null);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPolls, setAdminPolls] = useState([]);
  const [reg, setReg] = useState({ name: '', surname: '', idNumber: '', phone: '', password: '' });
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [resetView, setResetView] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [newPoll, setNewPoll] = useState({ question: '', optionA: '', optionB: '', startDate: '', endDate: '' });

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = token;
      fetchActivePoll();
      checkAdminStatus();
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const fetchActivePoll = async () => {
    try {
      const res = await axios.get(`${API}/polls/active`);
      setPoll(res.data.poll);
    } catch { setPoll(null); }
  };

  const checkAdminStatus = async () => {
    try {
      const res = await axios.get(`${API}/admin/polls`);
      setIsAdmin(true);
      setAdminPolls(res.data.polls);
    } catch { setIsAdmin(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/register`, reg);
      setMessage('Registration successful! Please login.');
      setView('login');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/login`, { phone: loginPhone, password: loginPassword });
      setToken(res.data.token);
      setView('poll');
      setMessage('');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Login failed');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/forgot-password`, { phone: resetPhone });
      setGeneratedToken(res.data.token);
      setMessage(`Reset token: ${res.data.token}`);
      setResetView('reset');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to generate token');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/reset-password`, { token: resetToken, newPassword: resetNewPassword });
      setMessage('Password reset successful! Please login.');
      setResetView('');
      setView('login');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Reset failed');
    }
  };

  const handleVote = async (choice) => {
    if (!poll) return;
    try {
      await axios.post(`${API}/vote`, { pollId: poll._id, choice });
      setMessage(`Voted ${choice === 'A' ? poll.optionA : poll.optionB} anonymously!`);
      fetchActivePoll();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Vote failed');
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/polls`, newPoll);
      setMessage('Poll created!');
      setNewPoll({ question: '', optionA: '', optionB: '', startDate: '', endDate: '' });
      checkAdminStatus();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to create poll');
    }
  };

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Delete this poll?')) return;
    try {
      await axios.delete(`${API}/admin/polls/${pollId}`);
      setMessage('Poll deleted');
      checkAdminStatus();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Delete failed');
    }
  };

  const exportPollResults = async (pollId) => {
    try {
      const res = await axios.get(`${API}/admin/polls/${pollId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `poll_${pollId}_totals.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMessage('Export failed');
    }
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('token');
    setView('login');
    setPoll(null);
    setIsAdmin(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#007A33' }}>🇿🇦 MzansiVoice</h1>
      {message && <div style={{ background: '#f0f0f0', padding: 10, marginBottom: 10 }}>{message}</div>}

      {view === 'login' && (
        <div>
          <button onClick={() => setView('register')}>Register</button>
          <button onClick={() => setView('login')}>Login</button>
          <form onSubmit={handleLogin} style={{ marginTop: 20 }}>
            <input placeholder="Phone" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} required /><br />
            <input type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required /><br />
            <button type="submit">Login</button>
            <p><button type="button" onClick={() => { setResetView('request'); setView(''); }} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>Forgot password?</button></p>
          </form>
        </div>
      )}

      {view === 'register' && (
        <div>
          <button onClick={() => setView('login')}>Back to Login</button>
          <form onSubmit={handleRegister} style={{ marginTop: 20 }}>
            <input placeholder="Name" value={reg.name} onChange={e => setReg({...reg, name: e.target.value})} required /><br />
            <input placeholder="Surname" value={reg.surname} onChange={e => setReg({...reg, surname: e.target.value})} required /><br />
            <input placeholder="ID Number" value={reg.idNumber} onChange={e => setReg({...reg, idNumber: e.target.value})} required /><br />
            <input placeholder="Phone" value={reg.phone} onChange={e => setReg({...reg, phone: e.target.value})} required /><br />
            <input type="password" placeholder="Password" value={reg.password} onChange={e => setReg({...reg, password: e.target.value})} required /><br />
            <button type="submit">Register</button>
          </form>
        </div>
      )}

      {resetView === 'request' && (
        <div>
          <h3>Reset Password</h3>
          <form onSubmit={handleForgotPassword}>
            <input placeholder="Phone number" value={resetPhone} onChange={e => setResetPhone(e.target.value)} required /><br />
            <button type="submit">Send Reset Token</button>
            <button type="button" onClick={() => { setResetView(''); setView('login'); }}>Back</button>
          </form>
        </div>
      )}

      {resetView === 'reset' && (
        <div>
          <h3>Enter Token & New Password</h3>
          <form onSubmit={handleResetPassword}>
            <input placeholder="Reset Token" value={resetToken} onChange={e => setResetToken(e.target.value)} required /><br />
            <input type="password" placeholder="New Password" value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} required /><br />
            <button type="submit">Reset Password</button>
            <button type="button" onClick={() => { setResetView(''); setView('login'); }}>Cancel</button>
          </form>
          {generatedToken && <p style={{fontSize:12, color:'green'}}>Token: {generatedToken}</p>}
        </div>
      )}

      {view === 'poll' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button onClick={logout}>Logout</button>
            {isAdmin && <button onClick={() => setView('admin')}>Admin Panel</button>}
          </div>
          {poll ? (
            <div>
              <h3>{poll.question}</h3>
              <div style={{ background: '#e9ecef', padding: 10, borderRadius: 8, margin: '15px 0', textAlign: 'center' }}>
                <TimerDisplay endDate={poll.endDate} />
              </div>
              <div style={{ margin: '20px 0', background: '#f9f9f9', padding: 15, borderRadius: 10 }}>
                <h4>Live Results</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[{ name: poll.optionA, votes: poll.votesA }, { name: poll.optionB, votes: poll.votesB }]}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="votes">
                      <Cell fill="#28a745" />
                      <Cell fill="#dc3545" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p>✅ {poll.optionA}: {poll.votesA} | ❌ {poll.optionB}: {poll.votesB}</p>
              </div>
              <div>
                <button onClick={() => handleVote('A')} disabled={new Date() > new Date(poll.endDate)} style={{ background: new Date() > new Date(poll.endDate) ? '#ccc' : '#28a745', color: 'white', padding: '10px 20px', marginRight: 10, border: 'none', borderRadius: 5 }}>Vote {poll.optionA}</button>
                <button onClick={() => handleVote('B')} disabled={new Date() > new Date(poll.endDate)} style={{ background: new Date() > new Date(poll.endDate) ? '#ccc' : '#dc3545', color: 'white', padding: '10px 20px', border: 'none', borderRadius: 5 }}>Vote {poll.optionB}</button>
              </div>
              {new Date() > new Date(poll.endDate) && <p style={{ color: 'red', marginTop: 10 }}>Voting ended.</p>}
            </div>
          ) : <p>No active poll. Admin can create one.</p>}
        </div>
      )}

      {view === 'admin' && isAdmin && (
        <div>
          <button onClick={() => setView('poll')}>← Back to Voting</button>
          <h3>Create New Poll</h3>
          <form onSubmit={handleCreatePoll}>
            <input placeholder="Question" value={newPoll.question} onChange={e => setNewPoll({...newPoll, question: e.target.value})} required /><br />
            <input placeholder="Option A (Yes)" value={newPoll.optionA} onChange={e => setNewPoll({...newPoll, optionA: e.target.value})} required /><br />
            <input placeholder="Option B (No)" value={newPoll.optionB} onChange={e => setNewPoll({...newPoll, optionB: e.target.value})} required /><br />
            <input type="datetime-local" value={newPoll.startDate} onChange={e => setNewPoll({...newPoll, startDate: e.target.value})} required /><br />
            <input type="datetime-local" value={newPoll.endDate} onChange={e => setNewPoll({...newPoll, endDate: e.target.value})} required /><br />
            <button type="submit">Create Poll</button>
          </form>
          <h3>All Polls</h3>
          {adminPolls.map(p => (
            <div key={p._id} style={{ border: '1px solid #ccc', margin: 10, padding: 10 }}>
              <strong>{p.question}</strong><br />
              {p.optionA}: {p.votesA} | {p.optionB}: {p.votesB}<br />
              <small>Start: {new Date(p.startDate).toLocaleString()} | End: {new Date(p.endDate).toLocaleString()}</small><br />
              <button onClick={() => exportPollResults(p._id)} style={{ background: 'blue', color: 'white', marginRight: 10 }}>Export CSV</button>
              <button onClick={() => handleDeletePoll(p._id)} style={{ background: 'red', color: 'white' }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
