# Safe release manager test matrix

| Scenario | Expected result |
|---|---|
| develop not ahead of main | no-op |
| exact develop SHA has no pc6 run | no-op |
| exact develop SHA has pending workflow | no-op |
| exact develop SHA has failed workflow | no-op |
| active release PR exists | no new branch or PR |
| main/develop moves during validation | fail closed |
| merge into release branch conflicts | fail and remove newly created branch |
| all gates green | create one unique release branch and one draft PR |
| validation not automatically triggered by token write | explicitly dispatch safe-release and pc6 only |
| dry run | report plan, perform no writes |
