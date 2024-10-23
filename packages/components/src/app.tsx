import { QuestsAnimatedLogo } from "./components/animated-logo";
import { QuestsLogoIcon } from "./components/logo";

function App() {
  return (
    <div className="h-screen w-screen dark:bg-black">
      <h1 className="text-sm font-mono p-4 dark:text-white">
        @quests/components
      </h1>
      <div className="flex-1 flex">
        <div className="p-4 flex flex-col items-center gap-2">
          <QuestsAnimatedLogo size={64} />
          <div className="text-xs font-mono text-gray-500">
            QuestsAnimatedLogo
          </div>
        </div>
        <div className="p-4 flex flex-col items-center gap-2">
          <QuestsLogoIcon size={64} />
          <div className="text-xs font-mono text-gray-500">QuestsLogoIcon</div>
        </div>
      </div>
    </div>
  );
}

export default App;
