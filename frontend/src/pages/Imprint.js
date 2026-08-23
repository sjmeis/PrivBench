/* Copyright (C) 2026 Stephen Meisenbacher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.*/

import { Typography } from "@mui/joy";
import DocumentPage from "../components/shared/DocumentPage";

const Imprint = () => {
  return (
    <DocumentPage title="Imprint">
      <Typography level="h4">Information according to § 5 TMG</Typography>
      <p>
        Stephen Meisenbacher<br />
        PO Box 86<br />
        Martinsville, NJ 08836<br />
        USA
      </p>

      <Typography level="h4">Represented by</Typography>
      <p>Stephen Meisenbacher</p>

      <Typography level="h4">Contact</Typography>
      <p>
        Email: admin@privbench.com<br />
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