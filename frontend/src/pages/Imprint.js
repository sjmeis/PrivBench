import { Typography } from "@mui/joy";
import DocumentPage from "../components/shared/DocumentPage";

const Imprint = () => {
  return (
    <DocumentPage title="Imprint">
      <Typography level="h4">Information according to § 5 TMG</Typography>
      <p>
        Technical University of Munich<br />
        School of Computation, Information and Technology<br />
        Boltzmannstraße 3<br />
        85748 Garching, Germany
      </p>

      <Typography level="h4">Represented by</Typography>
      <p>Prof. Dr. Florian Matthes</p>

      <Typography level="h4">Contact</Typography>
      <p>
        Phone: +49 (0) 89 17137<br />
        Email: stephen.meisenbacher@tum.de<br />
        Website: www.cs.cit.tum.de/sebis/
      </p>

      <Typography level="h4">Responsible for content according to § 55 Abs. 2 RStV</Typography>
      <p>
        Stephen Meisenbacher, M.Sc.<br />
        Boltzmannstraße 3<br />
        85748 Garching
      </p>
    </DocumentPage>
  );
};

export default Imprint;