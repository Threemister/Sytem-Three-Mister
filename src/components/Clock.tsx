/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export default function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDay = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
  };

  const formatMonth = (date: Date) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[date.getMonth()];
  };

  const dayName = formatDay(time);
  const day = time.getDate().toString().padStart(2, '0');
  const monthName = formatMonth(time);
  const year = time.getFullYear();
  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  return (
    <div id="live-clock" className="flex items-center gap-3 bg-[#580001] text-white px-3.5 py-1.5 rounded-lg border border-[#580001] shadow-xs font-mono text-xs">
      <div className="flex items-center gap-1.5 text-amber-200">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
        </span>
        <span className="font-bold tracking-wider">{hours}:{minutes}:{seconds}</span>
      </div>
      <div className="h-3.5 w-[1px] bg-white/25"></div>
      <div className="text-white/80 text-[11px] hidden sm:block">
        {dayName}, {day} {monthName} {year}
      </div>
    </div>
  );
}
