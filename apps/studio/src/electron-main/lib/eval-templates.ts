import { SelectableAppIconsSchema } from "@quests/shared/icons";
import { z } from "zod";

const EvalTemplateSchema = z.object({
  iconName: SelectableAppIconsSchema,
  name: z.string(),
  prompt: z.string(),
});

export const EvalTemplateGroupSchema = z.object({
  name: z.string(),
  templates: z.array(EvalTemplateSchema),
});

type EvalTemplateGroup = z.output<typeof EvalTemplateGroupSchema>;

function createSVGPrompt(description: string): string {
  return `Create an SVG and display it in the app. <svg-description>${description}</svg-description>`;
}

/* cspell:disable */
const EVAL_TEMPLATE_GROUPS: EvalTemplateGroup[] = [
  {
    name: "Simple Apps",
    templates: [
      {
        iconName: "calculator",
        name: "Calculator",
        prompt: "create a calculator app",
      },
    ],
  },
  {
    name: "Dynamic Visualizations",
    templates: [
      {
        iconName: "activity",
        name: "Pendulum Swing Simulator",
        prompt:
          "Create an animated visualization of a simple pendulum swinging back and forth, showing the bob's path as trailing lines with adjustable length and gravity.",
      },
      {
        iconName: "activity",
        name: "Double Pendulum Chaos",
        prompt:
          "Build a dynamic simulation of a double pendulum exhibiting chaotic motion, rendering the arms as lines and tracing the lower bob's unpredictable path over time.",
      },
      {
        iconName: "activity",
        name: "Wave Interference Patterns",
        prompt:
          "Generate an animation of interfering waves from multiple sources, visualizing constructive and destructive patterns as rippling lines on a 2D surface.",
      },
      {
        iconName: "sparkles",
        name: "Gravity Particle System",
        prompt:
          "Design a particle system where points attract each other via gravity, moving and clustering dynamically with colorful trails.",
      },
      {
        iconName: "activity",
        name: "Boid Flocking Behavior",
        prompt:
          "Simulate a flock of boids following rules of separation, alignment, and cohesion, rendering as moving points or arrows in a bounded space.",
      },
      {
        iconName: "sparkles",
        name: "Mandelbrot Set Zoom",
        prompt:
          "Create an animated zoom into the Mandelbrot fractal, revealing intricate patterns with evolving colors as the view dives deeper.",
      },
      {
        iconName: "sparkles",
        name: "Julia Set Morphing",
        prompt:
          "Animate a Julia set by varying the complex constant over time, showing the fractal boundary shifting and morphing smoothly.",
      },
      {
        iconName: "activity",
        name: "Lorenz Attractor Trails",
        prompt:
          "Visualize the Lorenz attractor with a point tracing butterfly-shaped paths, leaving persistent lines to build the chaotic structure.",
      },
      {
        iconName: "grid",
        name: "Conway's Game of Life",
        prompt:
          "Implement an animated cellular automaton following Conway's rules, displaying evolving patterns of live and dead cells as a grid.",
      },
      {
        iconName: "sparkles",
        name: "Fireworks Burst Animation",
        prompt:
          "Simulate exploding fireworks with particles expanding outward in colorful bursts, fading trails, and random variations in size and hue.",
      },
      {
        iconName: "cloud",
        name: "Raindrop Trails on Glass",
        prompt:
          "Animate raindrops falling and sliding down a virtual window, with streaks and merging paths rendered as dynamic lines.",
      },
      {
        iconName: "cloud",
        name: "Snowfall Drift",
        prompt:
          "Create a gentle snowfall visualization with flakes descending at varying speeds, accumulating or swirling with wind effects.",
      },
      {
        iconName: "star",
        name: "Starfield Warp Speed",
        prompt:
          "Generate a starfield animation simulating faster-than-light travel, with stars streaking past as lines elongating toward the center.",
      },
      {
        iconName: "sparkles",
        name: "Plasma Cloud Effect",
        prompt:
          "Build a shifting plasma visualization using sinusoidal functions, rendering colorful, blob-like patterns that morph over time.",
      },
      {
        iconName: "sparkles",
        name: "Metaball Blobs Merging",
        prompt:
          "Animate metaballs as soft, organic shapes that move, merge, and separate, creating smooth contours via implicit surfaces.",
      },
      {
        iconName: "grid",
        name: "Moving Voronoi Diagram",
        prompt:
          "Visualize a Voronoi diagram with seed points drifting randomly, updating cell boundaries dynamically as lines redraw.",
      },
      {
        iconName: "grid",
        name: "Delaunay Triangulation Shift",
        prompt:
          "Animate a set of points moving slowly, recomputing and rendering the Delaunay triangulation as evolving triangles.",
      },
      {
        iconName: "map",
        name: "Perlin Noise Terrain Flyover",
        prompt:
          "Simulate a flyover of a procedurally generated landscape using Perlin noise, with undulating lines representing height contours.",
      },
      {
        iconName: "activity",
        name: "Marching Squares Contours",
        prompt:
          "Create an animation of marching squares algorithm on a noisy field, drawing isolines that wiggle and change shape over time.",
      },
      {
        iconName: "cloud",
        name: "Fluid Smoke Simulation",
        prompt:
          "Visualize a simple fluid dynamics simulation of rising smoke, with particles advecting and diffusing as swirling points.",
      },
      {
        iconName: "activity",
        name: "Cloth Fabric Ripple",
        prompt:
          "Animate a cloth simulation with a grid of points connected by springs, rippling under wind or gravity influences.",
      },
      {
        iconName: "activity",
        name: "Rope Swing Physics",
        prompt:
          "Simulate a flexible rope made of linked segments, swinging or being pulled, rendered as connected lines with tension effects.",
      },
      {
        iconName: "activity",
        name: "Bouncing Elastic Balls",
        prompt:
          "Create multiple balls bouncing with elasticity, leaving trails as they collide and deform slightly on impact.",
      },
      {
        iconName: "globe",
        name: "Solar System Orbits",
        prompt:
          "Visualize planetary orbits around a sun, with ellipses traced by moving points representing planets at varying speeds.",
      },
      {
        iconName: "globe",
        name: "N-Body Gravitational Dance",
        prompt:
          "Animate an N-body simulation where bodies orbit and sling past each other, drawing their paths as curving lines.",
      },
      {
        iconName: "sparkles",
        name: "Reaction-Diffusion Patterns",
        prompt:
          "Generate Turing-like patterns from reaction-diffusion equations, showing spots or stripes forming and evolving dynamically.",
      },
      {
        iconName: "sparkles",
        name: "L-System Plant Growth",
        prompt:
          "Animate the iterative growth of an L-system plant, with branches extending as lines in a fractal-like manner.",
      },
      {
        iconName: "sparkles",
        name: "Fractal Tree Branching",
        prompt:
          "Visualize a recursive fractal tree growing over time, with branches splitting and leaves appearing as points.",
      },
      {
        iconName: "sparkles",
        name: "Koch Snowflake Iteration",
        prompt:
          "Animate the construction of a Koch snowflake, adding iterations progressively to form a detailed, moving boundary.",
      },
      {
        iconName: "sparkles",
        name: "Sierpinski Triangle Fade",
        prompt:
          "Create an animated Sierpinski triangle where points are plotted via chaos game, building the pattern gradually.",
      },
      {
        iconName: "sparkles",
        name: "Barnsley Fern Unfolding",
        prompt:
          "Simulate the Barnsley fern fractal by iteratively plotting points, animating the emergence of the leaf shape.",
      },
      {
        iconName: "sparkles",
        name: "Lyapunov Space Exploration",
        prompt:
          "Animate navigation through Lyapunov fractal space, with colors shifting as stability regions morph.",
      },
      {
        iconName: "activity",
        name: "Audio Waveform Visualizer",
        prompt:
          "Build a real-time waveform visualizer for simulated audio, rendering oscillating lines that dance to a beat.",
      },
      {
        iconName: "chart-bar",
        name: "Frequency Spectrum Bars",
        prompt:
          "Animate a spectrum analyzer with bars rising and falling to represent frequency amplitudes in a simulated sound.",
      },
      {
        iconName: "activity",
        name: "Lissajous Curve Harmonics",
        prompt:
          "Visualize Lissajous curves by varying frequencies, creating looping patterns that rotate and change shape.",
      },
      {
        iconName: "sparkles",
        name: "Spirograph Gear Patterns",
        prompt:
          "Simulate a spirograph with rotating gears, tracing hypnotic curves as lines in multiple colors.",
      },
      {
        iconName: "activity",
        name: "Harmonograph Pendulum Drawings",
        prompt:
          "Animate a harmonograph with decaying pendulums, drawing intricate, fading curves on the canvas.",
      },
      {
        iconName: "sparkles",
        name: "Polar Rose Petals",
        prompt:
          "Generate animated rose curves in polar coordinates, with petals blooming or rotating by changing parameters.",
      },
      {
        iconName: "sparkles",
        name: "Epitrochoid Roulette",
        prompt:
          "Visualize an epitrochoid curve traced by a point on a circle rolling around another, animating the motion.",
      },
      {
        iconName: "star",
        name: "Hypotrochoid Star Shapes",
        prompt:
          "Animate a hypotrochoid generator, creating star-like patterns that spin and evolve with ratio changes.",
      },
      {
        iconName: "activity",
        name: "Fourier Series Square Wave",
        prompt:
          "Demonstrate Fourier series approximating a square wave, adding harmonics progressively with moving components.",
      },
      {
        iconName: "activity",
        name: "Animated Bezier Curves",
        prompt:
          "Create an interactive Bezier curve animation where control points move, bending the curve dynamically.",
      },
      {
        iconName: "activity",
        name: "Spline Interpolation Flow",
        prompt:
          "Visualize Catmull-Rom splines connecting moving points, smoothing paths as they update in real-time.",
      },
      {
        iconName: "sparkles",
        name: "Particle Fountain Spray",
        prompt:
          "Simulate a fountain of particles shooting upward and falling with gravity, scattering as colorful points.",
      },
      {
        iconName: "sparkles",
        name: "Pixel Fire Embers",
        prompt:
          "Animate a pixel-based fire simulation with flames rising and embers floating upward in warm hues.",
      },
      {
        iconName: "cloud",
        name: "Turbulent Smoke Plumes",
        prompt:
          "Generate turbulent smoke plumes using vector fields, with particles twisting and dispersing realistically.",
      },
      {
        iconName: "activity",
        name: "Vortex Swirl Dynamics",
        prompt:
          "Visualize a vortex sucking in particles, spiraling them inward with accelerating lines.",
      },
      {
        iconName: "zap",
        name: "Magnetic Field Particle Paths",
        prompt:
          "Animate particles moving along magnetic field lines, curving and looping in a simulated dipole field.",
      },
      {
        iconName: "zap",
        name: "Electric Field Charge Interactions",
        prompt:
          "Simulate charged particles repelling or attracting, with field lines updating as positions change.",
      },
      {
        iconName: "activity",
        name: "Quantum Wave Packet Propagation",
        prompt:
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
        prompt: createSVGPrompt(
          "Show a tic-tac-toe board (3x3 grid) where X is about to win with three in a row diagonally. Display X's and O's clearly with the winning diagonal highlighted or emphasized.",
        ),
      },
      {
        iconName: "grid",
        name: "Checkers Triple Jump",
        prompt: createSVGPrompt(
          "Show a checkers board in a state where a red king is positioned to make a triple jump over black pieces. Include the 8x8 grid, alternating colors, and show the pieces with crowns for kings.",
        ),
      },
      {
        iconName: "grid",
        name: "Chess Endgame Position",
        prompt: createSVGPrompt(
          "Show a chess board (8x8 alternating light and dark squares) with an endgame position: a white king and queen on one side, a black king on the other, with the black king in check. Display pieces with distinct colors (white pieces in cream/white, black pieces in dark gray/black) and use classic chess piece symbols or silhouettes.",
        ),
      },
      {
        iconName: "home",
        name: "Monopoly Bankruptcy Scenario",
        prompt: createSVGPrompt(
          "Show a Monopoly board where one player is on the verge of bankruptcy, with properties owned by different players (use colors for ownership), hotels on Boardwalk and Park Place, and player tokens on specific spaces like 'Go to Jail.'",
        ),
      },
      {
        iconName: "grid",
        name: "Scrabble High-Score Word Placement",
        prompt: createSVGPrompt(
          "Show a Scrabble board with tiles forming high-scoring words like 'QUIXOTIC' across a triple word score, intersecting with other words. Show the 15x15 grid, premium squares in colors, and letter tiles with values.",
        ),
      },
      {
        iconName: "grid",
        name: "Battleship Sunken Fleet",
        prompt: createSVGPrompt(
          "Depict a Battleship game board (10x10 grid) where one player's fleet is mostly sunk, showing hits (red pegs), misses (white pegs), and remaining ships partially hidden. Include labels for rows (A-J) and columns (1-10).",
        ),
      },
      {
        iconName: "grid",
        name: "Minesweeper Flagged Minefield",
        prompt: createSVGPrompt(
          "Show a Minesweeper board (16x16 grid) with several cells revealed showing numbers (1-8), flags on suspected mines, and one hidden mine exposed for demonstration. Use gray for unrevealed, colors for numbers.",
        ),
      },
      {
        iconName: "grid",
        name: "Connect Four Winning Diagonal",
        prompt: createSVGPrompt(
          "Represent a Connect Four board (7x6 grid) with red and yellow discs, showing a winning diagonal for red while yellow has a potential but blocked win. Include the frame and slots.",
        ),
      },
      {
        iconName: "grid",
        name: "Crossword Puzzle Intersection",
        prompt: createSVGPrompt(
          "Show a crossword puzzle grid (15x15) partially filled in, with black squares forming the pattern, numbered cells, and several completed words intersecting both horizontally and vertically.",
        ),
      },
    ],
  },
  {
    name: "Influencer Evals",
    templates: [
      {
        iconName: "activity",
        name: "Image Generation Studio (Theo)",
        prompt:
          'This app is going to be a "image generation studio" using various AI models to turn a prompt into an image. Design a mocked version. It should be dark mode. Focus on making it beautiful.',
      },
      {
        iconName: "sparkles",
        name: "Pelican on Bicycle (Simon Willison)",
        prompt: "Generate an SVG of a pelican riding a bicycle.",
      },
    ],
  },
  {
    name: "Landing Pages & UI Clones",
    templates: [
      {
        iconName: "globe",
        name: "AI Career Timeline Landing Page",
        prompt:
          "Generate a landing page for a new AI startup that scans your face and tells you your most likely alternate career in another timeline.",
      },
      {
        iconName: "check",
        name: "Linear App Clone",
        prompt:
          "Recreate the Linear App UI, keeping the layout and animations as close as possible.",
      },
      {
        iconName: "sparkles",
        name: "Framer Style Animation",
        prompt:
          "Generate a landing page with smooth Framer-like transitions between sections.",
      },
      {
        iconName: "chart-bar",
        name: "Dark Mode Dashboard",
        prompt:
          "Design a sleek admin dashboard UI with light and dark mode toggle, featuring an AI analytics graph.",
      },
      {
        iconName: "globe",
        name: "Random Tailwind Webapp",
        prompt:
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
        prompt:
          "Recreate a Pokémon battle UI - make it interactive, nostalgic, and fun. Stick to the spirit of a classic battle, but feel free to get creative if you want.",
      },
      {
        iconName: "sparkles",
        name: "Super Mario Level",
        prompt:
          "Recreate a Super Mario Bros. level - make it interactive and fun, feel free to get creative and showcase your skills. Stick to the spirit of nintendo games.",
      },
      {
        iconName: "box",
        name: "Three.js City Builder",
        prompt:
          "Create a three.js 3D game where I can place buildings of various designs and sizes, and drive through the town I've created. Add traffic to the road as well.",
      },
      {
        iconName: "grid",
        name: "Interactive Catan Board",
        prompt:
          "Create a web app with an interactive hex grid like Settlers of Catan, where the number of hexes can be adjusted using a slider.",
      },
      {
        iconName: "zap",
        name: "Catch the Falling Object",
        prompt:
          "Create a very simple, playable mini-game. Game concept: A 'Catch the Falling Object' game where the player controls a basket/paddle at the bottom (using mouse movement or arrow keys) to catch simple shapes falling from the top. Keep the design minimal and clean. Include a basic score counter.",
      },
    ],
  },
];
/* cspell:enable */

export function getEvalTemplateGroups(): EvalTemplateGroup[] {
  return EVAL_TEMPLATE_GROUPS;
}
