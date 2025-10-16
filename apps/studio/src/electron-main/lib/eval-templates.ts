import { SelectableAppIconsSchema } from "@quests/shared/icons";
import { z } from "zod";

const EvalTemplateSchema = z.object({
  iconName: SelectableAppIconsSchema,
  name: z.string(),
  systemPrompt: z.string().optional(),
  userPrompt: z.string(),
});

export const EvalTemplateGroupSchema = z.object({
  name: z.string(),
  templates: z.array(EvalTemplateSchema),
});

type EvalTemplateGroup = z.output<typeof EvalTemplateGroupSchema>;

const SVG_SYSTEM_PROMPT = `Create an SVG matching the following description inline in ./src/client/app.tsx.`;

/* cspell:disable */
const EVAL_TEMPLATE_GROUPS: EvalTemplateGroup[] = [
  {
    name: "Simple Apps",
    templates: [
      {
        iconName: "calculator",
        name: "Calculator",
        userPrompt: "create a calculator app",
      },
    ],
  },
  {
    name: "Dynamic Visualizations",
    templates: [
      {
        iconName: "activity",
        name: "Pendulum Swing Simulator",
        userPrompt:
          "Create an animated visualization of a simple pendulum swinging back and forth, showing the bob's path as trailing lines with adjustable length and gravity.",
      },
      {
        iconName: "activity",
        name: "Double Pendulum Chaos",
        userPrompt:
          "Build a dynamic simulation of a double pendulum exhibiting chaotic motion, rendering the arms as lines and tracing the lower bob's unpredictable path over time.",
      },
      {
        iconName: "activity",
        name: "Wave Interference Patterns",
        userPrompt:
          "Generate an animation of interfering waves from multiple sources, visualizing constructive and destructive patterns as rippling lines on a 2D surface.",
      },
      {
        iconName: "sparkles",
        name: "Gravity Particle System",
        userPrompt:
          "Design a particle system where points attract each other via gravity, moving and clustering dynamically with colorful trails.",
      },
      {
        iconName: "activity",
        name: "Boid Flocking Behavior",
        userPrompt:
          "Simulate a flock of boids following rules of separation, alignment, and cohesion, rendering as moving points or arrows in a bounded space.",
      },
      {
        iconName: "sparkles",
        name: "Mandelbrot Set Zoom",
        userPrompt:
          "Create an animated zoom into the Mandelbrot fractal, revealing intricate patterns with evolving colors as the view dives deeper.",
      },
      {
        iconName: "sparkles",
        name: "Julia Set Morphing",
        userPrompt:
          "Animate a Julia set by varying the complex constant over time, showing the fractal boundary shifting and morphing smoothly.",
      },
      {
        iconName: "activity",
        name: "Lorenz Attractor Trails",
        userPrompt:
          "Visualize the Lorenz attractor with a point tracing butterfly-shaped paths, leaving persistent lines to build the chaotic structure.",
      },
      {
        iconName: "grid",
        name: "Conway's Game of Life",
        userPrompt:
          "Implement an animated cellular automaton following Conway's rules, displaying evolving patterns of live and dead cells as a grid.",
      },
      {
        iconName: "sparkles",
        name: "Fireworks Burst Animation",
        userPrompt:
          "Simulate exploding fireworks with particles expanding outward in colorful bursts, fading trails, and random variations in size and hue.",
      },
      {
        iconName: "cloud",
        name: "Raindrop Trails on Glass",
        userPrompt:
          "Animate raindrops falling and sliding down a virtual window, with streaks and merging paths rendered as dynamic lines.",
      },
      {
        iconName: "cloud",
        name: "Snowfall Drift",
        userPrompt:
          "Create a gentle snowfall visualization with flakes descending at varying speeds, accumulating or swirling with wind effects.",
      },
      {
        iconName: "star",
        name: "Starfield Warp Speed",
        userPrompt:
          "Generate a starfield animation simulating faster-than-light travel, with stars streaking past as lines elongating toward the center.",
      },
      {
        iconName: "sparkles",
        name: "Plasma Cloud Effect",
        userPrompt:
          "Build a shifting plasma visualization using sinusoidal functions, rendering colorful, blob-like patterns that morph over time.",
      },
      {
        iconName: "sparkles",
        name: "Metaball Blobs Merging",
        userPrompt:
          "Animate metaballs as soft, organic shapes that move, merge, and separate, creating smooth contours via implicit surfaces.",
      },
      {
        iconName: "grid",
        name: "Moving Voronoi Diagram",
        userPrompt:
          "Visualize a Voronoi diagram with seed points drifting randomly, updating cell boundaries dynamically as lines redraw.",
      },
      {
        iconName: "grid",
        name: "Delaunay Triangulation Shift",
        userPrompt:
          "Animate a set of points moving slowly, recomputing and rendering the Delaunay triangulation as evolving triangles.",
      },
      {
        iconName: "map",
        name: "Perlin Noise Terrain Flyover",
        userPrompt:
          "Simulate a flyover of a procedurally generated landscape using Perlin noise, with undulating lines representing height contours.",
      },
      {
        iconName: "activity",
        name: "Marching Squares Contours",
        userPrompt:
          "Create an animation of marching squares algorithm on a noisy field, drawing isolines that wiggle and change shape over time.",
      },
      {
        iconName: "cloud",
        name: "Fluid Smoke Simulation",
        userPrompt:
          "Visualize a simple fluid dynamics simulation of rising smoke, with particles advecting and diffusing as swirling points.",
      },
      {
        iconName: "activity",
        name: "Cloth Fabric Ripple",
        userPrompt:
          "Animate a cloth simulation with a grid of points connected by springs, rippling under wind or gravity influences.",
      },
      {
        iconName: "activity",
        name: "Rope Swing Physics",
        userPrompt:
          "Simulate a flexible rope made of linked segments, swinging or being pulled, rendered as connected lines with tension effects.",
      },
      {
        iconName: "activity",
        name: "Bouncing Elastic Balls",
        userPrompt:
          "Create multiple balls bouncing with elasticity, leaving trails as they collide and deform slightly on impact.",
      },
      {
        iconName: "globe",
        name: "Solar System Orbits",
        userPrompt:
          "Visualize planetary orbits around a sun, with ellipses traced by moving points representing planets at varying speeds.",
      },
      {
        iconName: "globe",
        name: "N-Body Gravitational Dance",
        userPrompt:
          "Animate an N-body simulation where bodies orbit and sling past each other, drawing their paths as curving lines.",
      },
      {
        iconName: "sparkles",
        name: "Reaction-Diffusion Patterns",
        userPrompt:
          "Generate Turing-like patterns from reaction-diffusion equations, showing spots or stripes forming and evolving dynamically.",
      },
      {
        iconName: "sparkles",
        name: "L-System Plant Growth",
        userPrompt:
          "Animate the iterative growth of an L-system plant, with branches extending as lines in a fractal-like manner.",
      },
      {
        iconName: "sparkles",
        name: "Fractal Tree Branching",
        userPrompt:
          "Visualize a recursive fractal tree growing over time, with branches splitting and leaves appearing as points.",
      },
      {
        iconName: "sparkles",
        name: "Koch Snowflake Iteration",
        userPrompt:
          "Animate the construction of a Koch snowflake, adding iterations progressively to form a detailed, moving boundary.",
      },
      {
        iconName: "sparkles",
        name: "Sierpinski Triangle Fade",
        userPrompt:
          "Create an animated Sierpinski triangle where points are plotted via chaos game, building the pattern gradually.",
      },
      {
        iconName: "sparkles",
        name: "Barnsley Fern Unfolding",
        userPrompt:
          "Simulate the Barnsley fern fractal by iteratively plotting points, animating the emergence of the leaf shape.",
      },
      {
        iconName: "sparkles",
        name: "Lyapunov Space Exploration",
        userPrompt:
          "Animate navigation through Lyapunov fractal space, with colors shifting as stability regions morph.",
      },
      {
        iconName: "activity",
        name: "Audio Waveform Visualizer",
        userPrompt:
          "Build a real-time waveform visualizer for simulated audio, rendering oscillating lines that dance to a beat.",
      },
      {
        iconName: "chart-bar",
        name: "Frequency Spectrum Bars",
        userPrompt:
          "Animate a spectrum analyzer with bars rising and falling to represent frequency amplitudes in a simulated sound.",
      },
      {
        iconName: "activity",
        name: "Lissajous Curve Harmonics",
        userPrompt:
          "Visualize Lissajous curves by varying frequencies, creating looping patterns that rotate and change shape.",
      },
      {
        iconName: "sparkles",
        name: "Spirograph Gear Patterns",
        userPrompt:
          "Simulate a spirograph with rotating gears, tracing hypnotic curves as lines in multiple colors.",
      },
      {
        iconName: "activity",
        name: "Harmonograph Pendulum Drawings",
        userPrompt:
          "Animate a harmonograph with decaying pendulums, drawing intricate, fading curves on the canvas.",
      },
      {
        iconName: "sparkles",
        name: "Polar Rose Petals",
        userPrompt:
          "Generate animated rose curves in polar coordinates, with petals blooming or rotating by changing parameters.",
      },
      {
        iconName: "sparkles",
        name: "Epitrochoid Roulette",
        userPrompt:
          "Visualize an epitrochoid curve traced by a point on a circle rolling around another, animating the motion.",
      },
      {
        iconName: "star",
        name: "Hypotrochoid Star Shapes",
        userPrompt:
          "Animate a hypotrochoid generator, creating star-like patterns that spin and evolve with ratio changes.",
      },
      {
        iconName: "activity",
        name: "Fourier Series Square Wave",
        userPrompt:
          "Demonstrate Fourier series approximating a square wave, adding harmonics progressively with moving components.",
      },
      {
        iconName: "activity",
        name: "Animated Bezier Curves",
        userPrompt:
          "Create an interactive Bezier curve animation where control points move, bending the curve dynamically.",
      },
      {
        iconName: "activity",
        name: "Spline Interpolation Flow",
        userPrompt:
          "Visualize Catmull-Rom splines connecting moving points, smoothing paths as they update in real-time.",
      },
      {
        iconName: "sparkles",
        name: "Particle Fountain Spray",
        userPrompt:
          "Simulate a fountain of particles shooting upward and falling with gravity, scattering as colorful points.",
      },
      {
        iconName: "sparkles",
        name: "Pixel Fire Embers",
        userPrompt:
          "Animate a pixel-based fire simulation with flames rising and embers floating upward in warm hues.",
      },
      {
        iconName: "cloud",
        name: "Turbulent Smoke Plumes",
        userPrompt:
          "Generate turbulent smoke plumes using vector fields, with particles twisting and dispersing realistically.",
      },
      {
        iconName: "activity",
        name: "Vortex Swirl Dynamics",
        userPrompt:
          "Visualize a vortex sucking in particles, spiraling them inward with accelerating lines.",
      },
      {
        iconName: "zap",
        name: "Magnetic Field Particle Paths",
        userPrompt:
          "Animate particles moving along magnetic field lines, curving and looping in a simulated dipole field.",
      },
      {
        iconName: "zap",
        name: "Electric Field Charge Interactions",
        userPrompt:
          "Simulate charged particles repelling or attracting, with field lines updating as positions change.",
      },
      {
        iconName: "activity",
        name: "Quantum Wave Packet Propagation",
        userPrompt:
          "Visualize a quantum wave packet propagating and dispersing, rendered as oscillating probability density lines.",
      },
    ],
  },
  {
    name: "Difficult Game State SVGs",
    templates: [
      {
        iconName: "grid",
        name: "Tic-Tac-Toe Winning Move",
        systemPrompt: SVG_SYSTEM_PROMPT,
        userPrompt:
          "Show a tic-tac-toe board (3x3 grid) where X is about to win with three in a row diagonally. Display X's and O's clearly with the winning diagonal highlighted or emphasized.",
      },
      {
        iconName: "grid",
        name: "Checkers Triple Jump",
        systemPrompt: SVG_SYSTEM_PROMPT,
        userPrompt:
          "Show a checkers board in a state where a red king is positioned to make a triple jump over black pieces. Include the 8x8 grid, alternating colors, and show the pieces with crowns for kings.",
      },
      {
        iconName: "grid",
        name: "Chess Endgame Position",
        systemPrompt: SVG_SYSTEM_PROMPT,
        userPrompt:
          "Show a chess board (8x8 alternating light and dark squares) with an endgame position: a white king and queen on one side, a black king on the other, with the black king in check. Display pieces with distinct colors (white pieces in cream/white, black pieces in dark gray/black) and use classic chess piece symbols or silhouettes.",
      },
      {
        iconName: "home",
        name: "Monopoly Bankruptcy Scenario",
        systemPrompt: SVG_SYSTEM_PROMPT,
        userPrompt:
          "Show a Monopoly board where one player is on the verge of bankruptcy, with properties owned by different players (use colors for ownership), hotels on Boardwalk and Park Place, and player tokens on specific spaces like 'Go to Jail.'",
      },
      {
        iconName: "grid",
        name: "Scrabble High-Score Word Placement",
        systemPrompt: SVG_SYSTEM_PROMPT,
        userPrompt:
          "Show a Scrabble board with tiles forming high-scoring words like 'QUIXOTIC' across a triple word score, intersecting with other words. Show the 15x15 grid, premium squares in colors, and letter tiles with values.",
      },
      {
        iconName: "grid",
        name: "Battleship Sunken Fleet",
        systemPrompt: SVG_SYSTEM_PROMPT,
        userPrompt:
          "Depict a Battleship game board (10x10 grid) where one player's fleet is mostly sunk, showing hits (red pegs), misses (white pegs), and remaining ships partially hidden. Include labels for rows (A-J) and columns (1-10).",
      },
      {
        iconName: "grid",
        name: "Minesweeper Flagged Minefield",
        systemPrompt: SVG_SYSTEM_PROMPT,
        userPrompt:
          "Show a Minesweeper board (16x16 grid) with several cells revealed showing numbers (1-8), flags on suspected mines, and one hidden mine exposed for demonstration. Use gray for unrevealed, colors for numbers.",
      },
      {
        iconName: "grid",
        name: "Connect Four Winning Diagonal",
        systemPrompt: SVG_SYSTEM_PROMPT,
        userPrompt:
          "Represent a Connect Four board (7x6 grid) with red and yellow discs, showing a winning diagonal for red while yellow has a potential but blocked win. Include the frame and slots.",
      },
      {
        iconName: "grid",
        name: "Crossword Puzzle Intersection",
        systemPrompt: SVG_SYSTEM_PROMPT,
        userPrompt:
          "Show a crossword puzzle grid (15x15) partially filled in, with black squares forming the pattern, numbered cells, and several completed words intersecting both horizontally and vertically.",
      },
    ],
  },
  {
    name: "Influencer Evals",
    templates: [
      {
        iconName: "activity",
        name: "Image Generation Studio (Theo)",
        userPrompt:
          'This app is going to be a "image generation studio" using various AI models to turn a prompt into an image. Design a mocked version. It should be dark mode. Focus on making it beautiful.',
      },
      {
        iconName: "sparkles",
        name: "Pelican on Bicycle (Simon Willison)",
        systemPrompt: SVG_SYSTEM_PROMPT,
        userPrompt: "Generate an SVG of a pelican riding a bicycle.",
      },
    ],
  },
  {
    name: "Landing Pages & UI Clones",
    templates: [
      {
        iconName: "globe",
        name: "AI Career Timeline Landing Page",
        userPrompt:
          "Generate a landing page for a new AI startup that scans your face and tells you your most likely alternate career in another timeline.",
      },
      {
        iconName: "check",
        name: "Linear App Clone",
        userPrompt:
          "Recreate the Linear App UI, keeping the layout and animations as close as possible.",
      },
      {
        iconName: "sparkles",
        name: "Framer Style Animation",
        userPrompt:
          "Generate a landing page with smooth Framer-like transitions between sections.",
      },
      {
        iconName: "chart-bar",
        name: "Dark Mode Dashboard",
        userPrompt:
          "Design a sleek admin dashboard UI with light and dark mode toggle, featuring an AI analytics graph.",
      },
      {
        iconName: "globe",
        name: "Random Tailwind Webapp",
        userPrompt:
          "Write code for a Webapp on a random category/industry/niche of your choosing using Tailwind CSS.",
      },
    ],
  },
  {
    name: "Interactive Games",
    templates: [
      {
        iconName: "sparkles",
        name: "Pokemon Battle UI",
        userPrompt:
          "Recreate a Pokémon battle UI - make it interactive, nostalgic, and fun. Stick to the spirit of a classic battle, but feel free to get creative if you want.",
      },
      {
        iconName: "sparkles",
        name: "Super Mario Level",
        userPrompt:
          "Recreate a Super Mario Bros. level - make it interactive and fun, feel free to get creative and showcase your skills. Stick to the spirit of nintendo games.",
      },
      {
        iconName: "box",
        name: "Three.js City Builder",
        userPrompt:
          "Create a three.js 3D game where I can place buildings of various designs and sizes, and drive through the town I've created. Add traffic to the road as well.",
      },
      {
        iconName: "grid",
        name: "Interactive Catan Board",
        userPrompt:
          "Create a web app with an interactive hex grid like Settlers of Catan, where the number of hexes can be adjusted using a slider.",
      },
      {
        iconName: "zap",
        name: "Catch the Falling Object",
        userPrompt:
          "Create a very simple, playable mini-game. Game concept: A 'Catch the Falling Object' game where the player controls a basket/paddle at the bottom (using mouse movement or arrow keys) to catch simple shapes falling from the top. Keep the design minimal and clean. Include a basic score counter.",
      },
    ],
  },
];
/* cspell:enable */

export function getEvalTemplateGroups(): EvalTemplateGroup[] {
  return EVAL_TEMPLATE_GROUPS;
}
