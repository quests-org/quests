import { Console } from "@/client/components/console";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/client/components/ui/table";
import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/debug/components")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useQuery(rpcClient.debug.systemInfo.queryOptions());

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="grid w-full grid-cols-2 gap-8 p-8">
        <Card>
          <CardHeader>
            <CardTitle>System Info</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {data?.map((item) => (
                  <TableRow key={item.title}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="text-right">{item.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <h1 className="mb-6 mt-12 text-2xl font-bold">Unused Code</h1>
      <p>Using it here so Knip does not complain and we can find it later.</p>
      {/* eslint-disable-next-line @typescript-eslint/no-empty-function */}
      <Console isCollapsed={false} onCollapse={() => {}} onRestore={() => {}} />
    </div>
  );
}
