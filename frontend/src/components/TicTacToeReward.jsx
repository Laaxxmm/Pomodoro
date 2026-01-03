import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, RefreshCw, X } from "lucide-react";

const TicTacToeReward = ({ isOpen, onClose, taskName }) => {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true); // User is X
    const [winner, setWinner] = useState(null);
    const [gameStatus, setGameStatus] = useState("playing"); // playing, won, draw, lost

    const checkWinner = (squares) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6],
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a];
            }
        }
        return null;
    };

    const handleClick = (i) => {
        if (board[i] || winner || !isXNext) return;

        const newBoard = [...board];
        newBoard[i] = "X";
        setBoard(newBoard);
        setIsXNext(false);

        const w = checkWinner(newBoard);
        if (w) {
            setWinner(w);
            setGameStatus("won");
        } else if (!newBoard.includes(null)) {
            setGameStatus("draw");
        }
    };

    // AI Opponent (Simple Random)
    useEffect(() => {
        if (!isXNext && !winner && gameStatus === "playing") {
            const timer = setTimeout(() => {
                const emptyIndices = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
                if (emptyIndices.length > 0) {
                    const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
                    const newBoard = [...board];
                    newBoard[randomIndex] = "O";
                    setBoard(newBoard);
                    setIsXNext(true);

                    const w = checkWinner(newBoard);
                    if (w) {
                        setWinner(w);
                        setGameStatus("lost");
                    } else if (!newBoard.includes(null)) {
                        setGameStatus("draw");
                    }
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isXNext, winner, gameStatus, board]);

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        setWinner(null);
        setGameStatus("playing");
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-none shadow-2xl">
                <DialogHeader>
                    <div className="mx-auto flex flex-col items-center justify-center text-center space-y-2">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full animate-bounce">
                            <Trophy className="h-8 w-8 text-amber-500" />
                        </div>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                            Task Completed!
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            Great job on "{taskName}". Take a quick break with a game!
                        </p>
                    </div>
                </DialogHeader>

                <div className="flex flex-col items-center mt-4">
                    <div className={`grid grid-cols-3 gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl ${winner ? 'opacity-90' : ''}`}>
                        {board.map((square, i) => (
                            <button
                                key={i}
                                className={`w-16 h-16 rounded-lg text-2xl font-bold flex items-center justify-center transition-all ${square === "X" ? "bg-violet-500 text-white" :
                                        square === "O" ? "bg-rose-500 text-white" :
                                            "bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
                                    }`}
                                onClick={() => handleClick(i)}
                                disabled={!!square || !!winner}
                            >
                                {square}
                            </button>
                        ))}
                    </div>

                    {/* Game Over Message */}
                    {gameStatus !== "playing" && (
                        <div className="mt-6 text-center animate-fade-in">
                            <p className="text-lg font-bold mb-2">
                                {gameStatus === "won" && "🎉 You Won! Amazing focus!"}
                                {gameStatus === "lost" && "🤖 AI Won! Try again!"}
                                {gameStatus === "draw" && "🤝 It's a Draw!"}
                            </p>
                            <div className="flex gap-2 justify-center">
                                <Button onClick={resetGame} size="sm" variant="outline" className="gap-2">
                                    <RefreshCw className="h-4 w-4" /> Play Again
                                </Button>
                                <Button onClick={onClose} size="sm" className="btn-primary gap-2">
                                    <X className="h-4 w-4" /> Close
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TicTacToeReward;
