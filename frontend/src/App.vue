import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Edit3, Trash2, Check, X, CheckCircle2, Circle } from 'lucide-react';

export default function DailyFlow() {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Menyelesaikan laporan bulanan", deadline: "2025-06-30", is_done: false, created_at: new Date() },
    { id: 2, title: "Meeting dengan tim marketing", deadline: "2025-06-28", is_done: true, created_at: new Date() },
    { id: 3, title: "Review kode aplikasi", deadline: "2025-07-01", is_done: false, created_at: new Date() }
  ]);
  const [newTask, setNewTask] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editedTaskTitle, setEditedTaskTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const addTask = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newTask.trim() || !newDeadline) return;
    
    const newTaskObj = {
      id: Date.now(),
      title: newTask,
      deadline: newDeadline,
      is_done: false,
      created_at: new Date()
    };
    
    setTasks([...tasks, newTaskObj]);
    setNewTask("");
    setNewDeadline("");
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const toggleDone = (task) => {
    setTasks(tasks.map(t => 
      t.id === task.id ? { ...t, is_done: !t.is_done } : t
    ));
  };

  const startEdit = (task) => {
    setEditingTaskId(task.id);
    setEditedTaskTitle(task.title);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditedTaskTitle("");
  };

  const updateTask = (task) => {
    if (!editedTaskTitle.trim()) return;
    
    setTasks(tasks.map(t => 
      t.id === task.id ? { ...t, title: editedTaskTitle } : t
    ));
    setEditingTaskId(null);
    setEditedTaskTitle("");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const sortedTasks = tasks.sort((a, b) => {
    if (a.is_done !== b.is_done) {
      return a.is_done ? 1 : -1;
    }
    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="text-center py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 tracking-tight">
              Daily
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent"> Flow</span>
            </h1>
            <p className="text-xl text-gray-300 font-light">Kelola aktivitas harianmu dengan indah</p>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 px-6 pb-20">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Add Task Card */}
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-white mb-2">Tambah Aktivitas Baru</h2>
                <div className="w-16 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full mx-auto"></div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="Apa yang perlu kamu lakukan?"
                      className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
                      disabled={isLoading}
                      onKeyPress={(e) => e.key === 'Enter' && addTask(e)}
                    />
                  </div>
                  
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300 w-5 h-5" />
                    <input
                      type="date"
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <button
                  onClick={addTask}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                  <span>Tambah Tugas</span>
                </button>
              </div>
            </div>

            {/* Tasks List */}
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-white mb-2">Daftar Aktivitasmu</h2>
                <div className="w-16 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full mx-auto"></div>
              </div>

              {sortedTasks.length > 0 ? (
                <div className="space-y-4">
                  {sortedTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className={`group backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:transform hover:scale-[1.02] ${
                        task.is_done ? 'opacity-75' : ''
                      }`}
                      style={{
                        animationDelay: `${index * 100}ms`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <button
                            onClick={() => toggleDone(task)}
                            className="flex-shrink-0 transition-all duration-300 hover:scale-110"
                            disabled={isLoading}
                          >
                            {task.is_done ? (
                              <CheckCircle2 className="w-6 h-6 text-green-400" />
                            ) : (
                              <Circle className="w-6 h-6 text-gray-400 hover:text-cyan-400" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            {editingTaskId === task.id ? (
                              <div className="space-y-3">
                                <input
                                  type="text"
                                  value={editedTaskTitle}
                                  onChange={(e) => setEditedTaskTitle(e.target.value)}
                                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                                  disabled={isLoading}
                                />
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => updateTask(task)}
                                    className="flex items-center space-x-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all duration-200"
                                    disabled={isLoading}
                                  >
                                    <Check className="w-4 h-4" />
                                    <span className="text-sm">Simpan</span>
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="flex items-center space-x-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-200"
                                    disabled={isLoading}
                                  >
                                    <X className="w-4 h-4" />
                                    <span className="text-sm">Batal</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <h3 className={`text-lg font-medium transition-all duration-300 ${
                                  task.is_done 
                                    ? 'text-gray-400 line-through' 
                                    : 'text-white group-hover:text-cyan-100'
                                }`}>
                                  {task.title}
                                </h3>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-400">
                                    {formatDate(task.deadline)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {editingTaskId !== task.id && (
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <button
                              onClick={() => startEdit(task)}
                              className="p-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all duration-200 hover:scale-110"
                              disabled={isLoading}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all duration-200 hover:scale-110"
                              disabled={isLoading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Plus className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-gray-300 text-lg">Belum ada tugas. Yuk, tambahkan yang baru! ✨</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
            <p className="text-white text-lg">Memuat tugas...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #06b6d4, #8b5cf6);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #0891b2, #7c3aed);
        }
      `}</style>
    </div>
  );
}