import SpinPrizeForm from "@/components/admin/SpinPrizeForm";

export default async function EditSpinPrizePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SpinPrizeForm prizeId={id} />;
}
