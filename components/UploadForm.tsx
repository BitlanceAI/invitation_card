"use client";
import { useState, useRef, ChangeEvent, FormEvent, MouseEvent } from "react";

interface Design {
    width: number;
    height: number;
    backgroundColor: string;
    backgroundImage: string;
    fontSize: number;
    textColor: string;
    x: number;
    y: number;
    textPattern: string;
}

export default function UploadForm() {
    const [step, setStep] = useState<number>(1); // 1: Design, 2: Upload & Generate
    const [loading, setLoading] = useState<boolean>(false);
    const [customTemplate, setCustomTemplate] = useState<File | null>(null);
    const [customTemplatePreview, setCustomTemplatePreview] = useState<string | null>(null);

    // Design State
    const [design, setDesign] = useState<Design>({
        width: 1200,
        height: 800,
        backgroundColor: "#ffffff",
        backgroundImage: "", // "template1.jpg", "template2.jpg", or empty
        fontSize: 60,
        textColor: "#000000",
        x: 400,
        y: 300,
        textPattern: "{name}", // Default pattern
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef<boolean>(false);

    // Handle Input Changes
    const handleDesignChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDesign((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleCustomTemplateChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCustomTemplate(file);
            setDesign(prev => ({ ...prev, backgroundImage: "" })); // Clear preset
            const url = URL.createObjectURL(file);
            setCustomTemplatePreview(url);

            // Optional: Update dimensions to match image
            const img = new Image();
            img.onload = () => {
                setDesign(prev => ({
                    ...prev,
                    width: img.naturalWidth,
                    height: img.naturalHeight
                }));
            };
            img.src = url;
        }
    };

    // Handle Dragging
    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        isDragging.current = true;
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isDragging.current || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        // Clamp values to container bounds
        const clampedX = Math.max(0, Math.min(offsetX, design.width));
        const clampedY = Math.max(0, Math.min(offsetY, design.height));

        setDesign(prev => ({
            ...prev,
            x: Math.round(clampedX),
            y: Math.round(clampedY)
        }));
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            const form = e.currentTarget;
            const formData = new FormData(form);

            // Append Design Data
            formData.append('width', design.width.toString());
            formData.append('height', design.height.toString());
            formData.append('backgroundColor', design.backgroundColor);
            formData.append('backgroundImage', design.backgroundImage);
            formData.append('fontSize', design.fontSize.toString());
            formData.append('color', design.textColor);
            formData.append('x', design.x.toString());
            formData.append('y', design.y.toString());
            formData.append('textPattern', design.textPattern);

            if (customTemplate) {
                formData.append('template', customTemplate);
            }

            const response = await fetch("/api/generate", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Generation failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "cards.zip";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to generate cards. Please check your inputs.");
        } finally {
            setLoading(false);
        }
    };

    // Helper to get background style
    const getPreviewStyle = () => {
        if (customTemplatePreview) {
            return {
                backgroundImage: `url(${customTemplatePreview})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: design.backgroundColor // Fallback
            };
        } else if (design.backgroundImage) {
            return {
                backgroundImage: `url(/templates/${design.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            };
        } else {
            return {
                backgroundColor: design.backgroundColor
            };
        }
    };

    return (
        <div className="w-full max-w-[90rem] mx-auto">
            {/* Stepper Header */}
            <div className="flex items-center justify-center mb-8">
                <div className={`flex items-center ${step >= 1 ? 'text-violet-400' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-violet-400 bg-violet-400/20' : 'border-gray-500'}`}>1</div>
                    <span className="ml-2 font-semibold">Design Card</span>
                </div>
                <div className={`w-24 h-1 mx-4 ${step >= 2 ? 'bg-violet-400' : 'bg-gray-700'}`}></div>
                <div className={`flex items-center ${step >= 2 ? 'text-violet-400' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-violet-400 bg-violet-400/20' : 'border-gray-500'}`}>2</div>
                    <span className="ml-2 font-semibold">Upload & Generate</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Visual Editor */}
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center min-h-[600px] overflow-auto">
                    <h3 className="text-xl font-semibold text-white mb-4">Card Preview</h3>

                    <div
                        ref={containerRef}
                        className="relative overflow-hidden shadow-lg cursor-crosshair transition-all duration-200"
                        style={{
                            width: `${design.width}px`,
                            height: `${design.height}px`,
                            ...getPreviewStyle(),
                            transform: 'scale(1)', // Display at true size
                            transformOrigin: 'top left'
                        }}
                        onMouseMove={step === 1 ? handleMouseMove : undefined}
                        onMouseUp={step === 1 ? handleMouseUp : undefined}
                        onMouseLeave={step === 1 ? handleMouseUp : undefined}
                    >
                        {/* Draggable Text Overlay */}
                        <div
                            onMouseDown={step === 1 ? handleMouseDown : undefined}
                            style={{
                                position: 'absolute',
                                left: `${design.x}px`,
                                top: `${design.y}px`,
                                color: design.textColor,
                                fontSize: `${design.fontSize}px`,
                                transform: 'translate(0, -100%)', // Anchor bottom-left to cursor
                                cursor: step === 1 ? 'move' : 'default',
                                userSelect: 'none',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                lineHeight: 1
                            }}
                            className={`hover:opacity-80 transition-opacity ${step === 1 ? 'border border-dashed border-gray-400/50 p-1' : ''}`}
                        >
                            {design.textPattern.replace('{name}', 'Guest Name')}
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="mt-4 text-sm text-gray-400">
                            <p>Drag the text to position it.</p>
                        </div>
                    )}
                </div>

                {/* Right Column: Controls */}
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl h-fit">
                    {step === 1 ? (
                        // STEP 1: DESIGN CONTROLS
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold text-white mb-6 text-center">Design Your Card</h2>

                            {/* Background Selection */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-200">Background Image</label>
                                <div>
                                    <button
                                        onClick={() => {
                                            setDesign(prev => ({ ...prev, backgroundImage: "" }));
                                            document.getElementById('custom-template-input')?.click();
                                        }}
                                        className={`w-full p-3 rounded-lg border ${customTemplate ? 'border-violet-500 bg-violet-500/20' : 'border-white/10 bg-white/5'} text-sm text-white transition-all flex items-center justify-center gap-2 hover:bg-white/10`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                        </svg>
                                        Upload Background Image
                                    </button>
                                    <input
                                        id="custom-template-input"
                                        type="file"
                                        accept=".png, .jpg, .jpeg"
                                        className="hidden"
                                        onChange={handleCustomTemplateChange}
                                    />
                                </div>
                                {customTemplate && (
                                    <div className="text-xs text-violet-300 mt-1 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                        </svg>
                                        Selected: {customTemplate.name}
                                    </div>
                                )}
                            </div>

                            {/* Text Pattern Input */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-200">
                                    Text Content <span className="text-gray-400 text-xs">(Use {"{name}"} for guest name)</span>
                                </label>
                                <input
                                    type="text"
                                    name="textPattern"
                                    value={design.textPattern}
                                    onChange={handleDesignChange}
                                    placeholder="e.g. Dear {name},"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-200">Font Size (px)</label>
                                    <input
                                        type="number"
                                        name="fontSize"
                                        value={design.fontSize}
                                        onChange={handleDesignChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-200">Text Color</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            name="textColor"
                                            value={design.textColor}
                                            onChange={handleDesignChange}
                                            className="h-10 w-10 rounded cursor-pointer border-none bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            name="textColor"
                                            value={design.textColor}
                                            onChange={handleDesignChange}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-200">X Position</label>
                                    <input
                                        type="number"
                                        name="x"
                                        value={design.x}
                                        onChange={handleDesignChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-200">Y Position</label>
                                    <input
                                        type="number"
                                        name="y"
                                        value={design.y}
                                        onChange={handleDesignChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                className="w-full py-3 px-6 rounded-lg bg-violet-600 text-white font-semibold text-lg hover:bg-violet-700 transition-all shadow-lg mt-4"
                            >
                                Next: Upload Names →
                            </button>
                        </div>
                    ) : (
                        // STEP 2: UPLOAD & GENERATE
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <h2 className="text-3xl font-bold text-white mb-6 text-center">Upload CSV</h2>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-200">
                                    Select CSV File (Names List)
                                </label>
                                <input
                                    type="file"
                                    name="csv"
                                    accept=".csv"
                                    required
                                    className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer bg-white/5 rounded-lg border border-white/10 p-2 transition-all focus:ring-2 focus:ring-violet-500 outline-none"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 px-6 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition-all"
                                >
                                    ← Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] py-3 px-6 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-lg hover:from-violet-700 hover:to-indigo-700 focus:ring-4 focus:ring-violet-500/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : (
                                        "Generate Cards"
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
