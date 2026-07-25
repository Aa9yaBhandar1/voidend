import { api } from "~/trpc/react";
import { toast } from "sonner";

function invalidateAuthConfigQueries(utils: ReturnType<typeof api.useUtils>) {
    void utils.authConfig.getByEndpoint.invalidate();
    void utils.endpoint.getByProject.invalidate();
    void utils.endpoint.getById.invalidate();
}

export function useAuthConfig(endpointId: string | null | undefined) {
    return api.authConfig.getByEndpoint.useQuery(
        { endpointId: endpointId ?? "" },
        { enabled: !!endpointId },
    );
}

export function useUpsertAuthConfig() {
    const utils = api.useUtils();
    return api.authConfig.upsert.useMutation({
        onSuccess: () => {
            invalidateAuthConfigQueries(utils);
            toast.success("Authentication settings saved");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to save authentication settings");
        },
    });
}

export function useDeleteAuthConfig() {
    const utils = api.useUtils();
    return api.authConfig.delete.useMutation({
        onSuccess: () => {
            invalidateAuthConfigQueries(utils);
            toast.success("Authentication settings reset");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete authentication settings");
        },
    });
}
