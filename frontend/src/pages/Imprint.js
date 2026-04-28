import { Typography } from "@mui/joy";
import DocumentPage from "../components/shared/DocumentPage";

const Imprint = () => {
  return (
    <DocumentPage title="Imprint">
      <Typography level="h4">Information according to § 5 TMG</Typography>
      <p>
        GTG Development Corporation<br />
        PO Box 86<br />
        Martinsville, NJ 08836<br />
        USA
      </p>

      <Typography level="h4">Represented by</Typography>
      <p>Stephen Meisenbacher</p>

      <Typography level="h4">Contact</Typography>
      <p>
        Email: stephen.meisenbacher@tum.de<br />
      </p>

      <Typography level="h4">Responsible for content according to § 55 Abs. 2 RStV</Typography>
      <p>
        Stephen Meisenbacher<br />
        PO Box 86<br />
        Martinsville, NJ 08836<br />
        USA
      </p>
    </DocumentPage>
  );
};

export default Imprint;