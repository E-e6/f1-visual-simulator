import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, Pause, RotateCcw, Settings, TrendingUp, Trophy, Zap, AlertCircle } from 'lucide-react';

const AdvancedF1Simulator = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  const [config, setConfig] = useState({
    totalLaps: 50,
    trackLength: 5.5,
    startingTyre: 'medium',
    trackTemp: 35,
    weatherCondition: 'dry',
    trackType: 'balanced',
    numRivals: 5,
    aiDifficulty: 'medium'
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLap, setCurrentLap] = useState(0);
  const [raceProgress, setRaceProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(true);
  
  const [cars, setCars] = useState([]);
  const [raceData, setRaceData] = useState([]);
  const [standings, setStandings] = useState([]);
  const [events, setEvents] = useState([]);
  const [chartData, setChartData] = useState([]);

  const tyreCompounds = {
    soft: { color: '#ef4444', baseLapTime: 87.5, degradation: 0.18, grip: 1.15, name: 'Soft' },
    medium: { color: '#f59e0b', baseLapTime: 88.5, degradation: 0.10, grip: 1.05, name: 'Medium' },
    hard: { color: '#6b7280', baseLapTime: 89.8, degradation: 0.05, grip: 0.95, name: 'Hard' },
    inter: { color: '#10b981', baseLapTime: 92.0, degradation: 0.08, grip: 1.0, name: 'Inter' },
    wet: { color: '#3b82f6', baseLapTime: 95.0, degradation: 0.04, grip: 0.9, name: 'Wet' }
  };

  const trackTypes = {
    balanced: { name: 'Balanced', cornerCount: 16, straights: 3, degradation: 1.0 },
    highSpeed: { name: 'High Speed', cornerCount: 10, straights: 5, degradation: 0.7 },
    technical: { name: 'Technical', cornerCount: 22, straights: 2, degradation: 1.4 },
    street: { name: 'Street Circuit', cornerCount: 18, straights: 4, degradation: 1.1 }
  };

  const initializeRace = () => {
    const initialCars = [
      { id: 0, name: 'Player', position: 1, lapTime: 0, totalTime: 0, currentTyre: config.startingTyre, tyreAge: 0, tyreLife: 100, pitStops: 0, trackPosition: 0, speed: 0, isPlayer: true, strategy: 'balanced' },
      ...Array.from({ length: config.numRivals }, (_, i) => ({
        id: i + 1,
        name: `Rival ${i + 1}`,
        position: i + 2,
        lapTime: 0,
        totalTime: 0,
        currentTyre: ['soft', 'medium', 'hard'][Math.floor(Math.random() * 3)],
        tyreAge: 0,
        tyreLife: 100,
        pitStops: 0,
        trackPosition: -(i + 1) * 0.05,
        speed: 0,
        isPlayer: false,
        strategy: ['aggressive', 'balanced', 'conservative'][Math.floor(Math.random() * 3)]
      }))
    ];
    
    setCars(initialCars);
    setStandings(initialCars);
    setCurrentLap(0);
    setRaceProgress(0);
    setRaceData([]);
    setChartData([]);
    setEvents([]);
  };

  const simulateLap = () => {
    setCars(prevCars => {
      const updatedCars = prevCars.map(car => {
        const tyre = tyreCompounds[car.currentTyre];
        const track = trackTypes[config.trackType];
        
        const tyreEffect = tyre.degradation * car.tyreAge * track.degradation;
        const tempEffect = Math.abs(config.trackTemp - 30) * 0.02;
        const weatherEffect = config.weatherCondition === 'wet' && !['inter', 'wet'].includes(car.currentTyre) ? 5.0 : 0;
        const strategyEffect = car.strategy === 'aggressive' ? -0.3 : car.strategy === 'conservative' ? 0.3 : 0;
        const randomVariation = (Math.random() - 0.5) * 0.8;
        
        const lapTime = tyre.baseLapTime + tyreEffect + tempEffect + weatherEffect + strategyEffect + randomVariation;
        const newTyreLife = Math.max(0, car.tyreLife - (tyre.degradation * track.degradation * 100 * (car.strategy === 'aggressive' ? 1.3 : 1.0)));
        
        let shouldPit = false;
        let newTyre = car.currentTyre;
        let pitTime = 0;
        
        if ((newTyreLife < 25 || (newTyreLife < 40 && car.strategy === 'aggressive')) && currentLap < config.totalLaps - 5) {
          shouldPit = true;
          pitTime = 22 + (Math.random() * 2);
          
          if (config.totalLaps - currentLap > 25) newTyre = 'hard';
          else if (config.totalLaps - currentLap > 15) newTyre = 'medium';
          else newTyre = 'soft';
        }

        return {
          ...car,
          lapTime: shouldPit ? lapTime + pitTime : lapTime,
          totalTime: car.totalTime + (shouldPit ? lapTime + pitTime : lapTime),
          tyreAge: shouldPit ? 0 : car.tyreAge + 1,
          tyreLife: shouldPit ? 100 : newTyreLife,
          currentTyre: shouldPit ? newTyre : car.currentTyre,
          pitStops: shouldPit ? car.pitStops + 1 : car.pitStops,
          speed: 300 - (tyreEffect * 5),
          lastPit: shouldPit
        };
      });

      const sorted = [...updatedCars].sort((a, b) => a.totalTime - b.totalTime);
      const withPositions = sorted.map((car, idx) => ({
        ...car,
        position: idx + 1,
        positionChange: car.position - (idx + 1)
      }));

      setStandings(withPositions);
      
      const playerData = withPositions.find(c => c.isPlayer);
      setChartData(prev => [...prev, {
        lap: currentLap + 1,
        lapTime: playerData.lapTime.toFixed(3),
        tyreLife: playerData.tyreLife,
        position: playerData.position
      }]);

      withPositions.forEach(car => {
        if (car.lastPit) {
          setEvents(prev => [{
            lap: currentLap + 1,
            message: `${car.name} pits for ${tyreCompounds[car.currentTyre].name} tyres`,
            type: 'pit'
          }, ...prev].slice(0, 10));
        }
        if (car.positionChange > 0) {
          setEvents(prev => [{
            lap: currentLap + 1,
            message: `${car.name} overtakes! Now P${car.position}`,
            type: 'overtake'
          }, ...prev].slice(0, 10));
        }
      });

      return withPositions;
    });
  };

  const drawTrack = (ctx, width, height) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(50, 50, width - 100, height - 100);

    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = width / 2 - 100;
    const radiusY = height / 2 - 100;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 80;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX + radiusX - 40, centerY - 5, 40, 10);
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(centerX + radiusX - 40 + (i * 5), centerY - 5, 5, 10);
      }
    }

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(centerX - 5, centerY - radiusY - 40, 10, 30);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(centerX - radiusX - 40, centerY - 5, 30, 10);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(centerX - 5, centerY + radiusY + 10, 10, 30);
  };

  const drawCars = (ctx, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = width / 2 - 100;
    const radiusY = height / 2 - 100;

    cars.forEach((car, idx) => {
      const angle = (car.trackPosition + raceProgress) * Math.PI * 2;
      const x = centerX + radiusX * Math.cos(angle);
      const y = centerY + radiusY * Math.sin(angle);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(-8, -6, 16, 12);

      ctx.fillStyle = car.isPlayer ? '#8b5cf6' : `hsl(${idx * 60}, 70%, 50%)`;
      ctx.fillRect(-7, -5, 14, 10);

      ctx.fillStyle = tyreCompounds[car.currentTyre].color;
      ctx.fillRect(-8, -6, 3, 12);
      ctx.fillRect(5, -6, 3, 12);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(car.position, 0, 2);

      ctx.restore();

      if (car.isPlayer || idx < 3) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x + 15, y - 20, 100, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`P${car.position} ${car.name}`, x + 20, y - 10);
        ctx.font = '9px Arial';
        ctx.fillText(`${tyreCompounds[car.currentTyre].name} (${car.tyreLife.toFixed(0)}%)`, x + 20, y);
        ctx.fillText(`Lap: ${car.lapTime.toFixed(2)}s`, x + 20, y + 12);
      }
    });
  };

  const drawHUD = (ctx, width, height) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 250, 120);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Lap ${currentLap} / ${config.totalLaps}`, 20, 35);
    
    ctx.font = '12px Arial';
    const playerCar = cars.find(c => c.isPlayer);
    if (playerCar) {
      ctx.fillText(`Position: P${playerCar.position}`, 20, 55);
      ctx.fillText(`Current Tyre: ${tyreCompounds[playerCar.currentTyre].name}`, 20, 75);
      ctx.fillText(`Tyre Life: ${playerCar.tyreLife.toFixed(1)}%`, 20, 95);
      ctx.fillText(`Pit Stops: ${playerCar.pitStops}`, 20, 115);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, height - 40, width - 20, 30);
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(15, height - 35, (width - 30) * (currentLap / config.totalLaps), 20);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, height - 35, width - 30, 20);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${((currentLap / config.totalLaps) * 100).toFixed(1)}% Complete`, width / 2, height - 20);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isSimulating) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let animationSpeed = 0;
    const targetSpeed = 0.008;

    const animate = () => {
      if (isPaused) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      animationSpeed = Math.min(animationSpeed + 0.0002, targetSpeed);

      drawTrack(ctx, width, height);
      drawCars(ctx, width, height);
      drawHUD(ctx, width, height);

      setRaceProgress(prev => {
        const newProgress = prev + animationSpeed;
        if (newProgress >= 1) {
          setCurrentLap(lap => {
            const nextLap = lap + 1;
            if (nextLap > config.totalLaps) {
              setIsSimulating(false);
              setEvents(prev => [{ lap: nextLap, message: '🏁 Race Finished!', type: 'finish' }, ...prev].slice(0, 10));
              return lap;
            }
            simulateLap();
            return nextLap;
          });
          return 0;
        }
        return newProgress;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSimulating, isPaused, cars, currentLap, config.totalLaps]);

  const startRace = () => {
    initializeRace();
    setIsSimulating(true);
    setIsPaused(false);
    setShowSettings(false);
    setEvents([{ lap: 0, message: '🏁 Race Started!', type: 'start' }]);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const resetRace = () => {
    setIsSimulating(false);
    setIsPaused(false);
    setShowSettings(true);
    initializeRace();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/20 overflow-hidden">
          
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Trophy className="animate-pulse" size={40} />
              F1 Visual Race Simulator
            </h1>
            <p className="text-purple-100 mt-2">Real-time 3D Race Simulation with AI Strategy</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="w-full rounded-lg"
                  style={{ maxHeight: '600px' }}
                />
              </div>

              <div className="flex gap-3">
                {!isSimulating ? (
                  <button
                    onClick={startRace}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={24} />
                    Start Race
                  </button>
                ) : (
                  <button
                    onClick={togglePause}
                    className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isPaused ? <Play size={24} /> : <Pause size={24} />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                )}
                
                <button
                  onClick={resetRace}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-8 rounded-xl transition-all flex items-center gap-2"
                >
                  <RotateCcw size={24} />
                  Reset
                </button>

                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-xl transition-all"
                >
                  <Settings size={24} />
                </button>
              </div>

              {chartData.length > 0 && (
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <TrendingUp size={20} />
                    Performance Analysis
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="lap" stroke="#94a3b8" />
                      <YAxis yAxisId="left" stroke="#94a3b8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="lapTime" stroke="#8b5cf6" strokeWidth={2} name="Lap Time" />
                      <Line yAxisId="right" type="monotone" dataKey="tyreLife" stroke="#10b981" strokeWidth={2} name="Tyre Life %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="space-y-4">
              
              {showSettings && (
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Settings size={20} />
                    Race Configuration
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-300 text-sm mb-1 block">Total Laps</label>
                      <input
                        type="number"
                        value={config.totalLaps}
                        onChange={(e) => setConfig({...config, totalLaps: parseInt(e.target.value)})}
                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600"
                        min="10"
                        max="100"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-1 block">Starting Tyre</label>
                      <select
                        value={config.startingTyre}
                        onChange={(e) => setConfig({...config, startingTyre: e.target.value})}
                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600"
                      >
                        <option value="soft">Soft</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-1 block">Track Type</label>
                      <select
                        value={config.trackType}
                        onChange={(e) => setConfig({...config, trackType: e.target.value})}
                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600"
                      >
                        {Object.entries(trackTypes).map(([key, track]) => (
                          <option key={key} value={key}>{track.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-1 block">Number of Rivals</label>
                      <input
                        type="number"
                        value={config.numRivals}
                        onChange={(e) => setConfig({...config, numRivals: parseInt(e.target.value)})}
                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600"
                        min="1"
                        max="19"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-1 block">Track Temp (°C)</label>
                      <input
                        type="number"
                        value={config.trackTemp}
                        onChange={(e) => setConfig({...config, trackTemp: parseInt(e.target.value)})}
                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600"
                        min="15"
                        max="55"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Trophy size={20} className="text-yellow-400" />
                  Live Standings
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {standings.map((car) => (
                    <div
                      key={car.id}
                      className={`p-3 rounded-lg ${car.isPlayer ? 'bg-purple-600/30 border-2 border-purple-500' : 'bg-slate-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-white">P{car.position}</span>
                          <div>
                            <div className="text-white font-semibold">{car.name}</div>
                            <div className="text-xs text-slate-400">
                              {tyreCompounds[car.currentTyre].name} • {car.tyreLife.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        {car.positionChange > 0 && (
                          <span className="text-green-400 text-sm">↑{car.positionChange}</span>
                        )}
                        {car.positionChange < 0 && (
                          <span className="text-red-400 text-sm">↓{Math.abs(car.positionChange)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <AlertCircle size={20} className="text-blue-400" />
                  Race Events
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {events.map((event, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg text-sm ${
                        event.type === 'pit' ? 'bg-yellow-600/20 text-yellow-300' :
                        event.type === 'overtake' ? 'bg-green-600/20 text-green-300' :
                        event.type === 'finish' ? 'bg-purple-600/20 text-purple-300' :
                        'bg-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="font-bold">Lap {event.lap}:</span> {event.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedF1Simulator;