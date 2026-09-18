import Loader from "./loader";

export function FullScreenLoading() {
  return (
    <div className="flex items-center justify-center h-screen w-screen">
      <Loader />
    </div>
  );
}
