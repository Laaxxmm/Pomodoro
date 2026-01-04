import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

const CARDS = ["🍎", "🍊", "🍇", "🍉", "🍌", "🍒", "🍓", "🥝"];

const MemoryMatchGame = ({ onClose }) => {
    const [grid, setGrid] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState([]);
    const [moves, setMoves] = useState(0);
    const [won, setWon] = useState(false);

    useEffect(() => {
        initializeGame();
    }, []);

    const initializeGame = () => {
        const doubled = [...CARDS, ...CARDS];
        const shuffled = doubled.sort(() => Math.random() - 0.5);
        setGrid(shuffled);
        setFlipped([]);
        setMatched([]);
        setMoves(0);
        setWon(false);
    };

    const handleCardClick = (index) => {
        if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;

        const newFlipped = [...flipped, index];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            setMoves(moves + 1);
            const [first, second] = newFlipped;
            if (grid[first] === grid[second]) {
                setMatched([...matched, first, second]);
                setFlipped([]);
                if (matched.length + 2 === grid.length) {
                    setWon(true);
                    confetti({
                        particleCount: 150,
                        spread: 60,
                    });
                }
            } else {
                setTimeout(() => setFlipped([]), 1000);
            }
        }
    };

    return (
        <Card className="p-6 w-full max-w-md bg-white/90 backdrop-blur-xl border-2 border-violet-100 shadow-2xl animate-in zoom-in-50 duration-300">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        Memory Match
                    </h3>
                    <p className="text-xs text-muted-foreground">Moves: {moves}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={initializeGame}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-6">
                {grid.map((emoji, index) => {
                    const isFlipped = flipped.includes(index) || matched.includes(index);
                    return (
                        <button
                            key={index}
                            onClick={() => handleCardClick(index)}
                            className={`aspect-square rounded-xl text-3xl flex items-center justify-center transition-all duration-300 transform ${isFlipped ? 'bg-white border-2 border-violet-200 rotate-y-180' : 'bg-violet-100 hover:bg-violet-200 border-2 border-violet-100'}`}
                            disabled={won}
                        >
                            {isFlipped ? emoji : "?"}
                        </button>
                    )
                })}
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
        </Card>
    );
};

export default MemoryMatchGame;
