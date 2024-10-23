import {
  GitError as DugiteGitError,
  parseBadConfigValueErrorInfo,
} from "dugite";

// Adapted from https://github.com/desktop/desktop/blob/development/app/src/lib/git/core.ts
export function descriptionForGitError(error: DugiteGitError, stderr: string) {
  switch (error) {
    case DugiteGitError.BadConfigValue: {
      const errorInfo = parseBadConfigValueErrorInfo(stderr);
      if (errorInfo === null) {
        return "Unsupported git configuration value.";
      }

      return `Unsupported value '${errorInfo.value}' for git config key '${errorInfo.key}'`;
    }
    case DugiteGitError.BadRevision: {
      return "Bad revision.";
    }
    case DugiteGitError.BranchAlreadyExists: {
      return "A branch with that name already exists.";
    }
    case DugiteGitError.BranchDeletionFailed: {
      return "Could not delete the branch. It was probably already deleted.";
    }
    case DugiteGitError.BranchRenameFailed: {
      return "The branch could not be renamed.";
    }
    case DugiteGitError.CannotMergeUnrelatedHistories: {
      return "Unable to merge unrelated histories in this repository.";
    }
    case DugiteGitError.ConfigLockFileAlreadyExists: {
      return "A lock file already exists in the repository, which blocks this operation from completing.";
    }
    case DugiteGitError.ConflictModifyDeletedInBranch:
    case DugiteGitError.GPGFailedToSignData:
    case DugiteGitError.MergeCommitNoMainlineOption:
    case DugiteGitError.MergeWithLocalChanges:
    case DugiteGitError.PathExistsButNotInRef:
    case DugiteGitError.PushWithSecretDetected:
    case DugiteGitError.RebaseWithLocalChanges:
    case DugiteGitError.UnsafeDirectory: {
      // This was null in the original code, which I think means these errors don't matter
      return null;
    }
    case DugiteGitError.DefaultBranchDeletionFailed: {
      return `The branch is the repository's default branch and cannot be deleted.`;
    }
    case DugiteGitError.EmptyRebasePatch: {
      return "There aren’t any changes left to apply.";
    }
    case DugiteGitError.ForcePushRejected: {
      return "The force push has been rejected for the current branch.";
    }
    case DugiteGitError.HexBranchNameRejected: {
      return "The branch name cannot be a 40-character string of hexadecimal characters, as this is the format that Git uses for representing objects.";
    }
    case DugiteGitError.HostDown: {
      return "The host is down. Check your Internet connection and try again.";
    }
    case DugiteGitError.HTTPSAuthenticationFailed:
    case DugiteGitError.SSHAuthenticationFailed:
    case DugiteGitError.SSHPermissionDenied: {
      return "Authentication failed. Please check your credentials and try again.";
    }
    case DugiteGitError.HTTPSRepositoryNotFound:
    case DugiteGitError.SSHRepositoryNotFound: {
      return "The repository does not seem to exist anymore. You may not have access, or it may have been deleted or renamed.";
    }
    case DugiteGitError.InvalidMerge: {
      return "This is not something we can merge.";
    }
    case DugiteGitError.InvalidObjectName: {
      return "The object was not found in the Git repository.";
    }
    case DugiteGitError.InvalidRebase: {
      return "This is not something we can rebase.";
    }
    case DugiteGitError.InvalidRefLength: {
      return "A ref cannot be longer than 255 characters.";
    }
    case DugiteGitError.InvalidSubmoduleSHA: {
      return "A submodule points to a commit which does not exist.";
    }
    case DugiteGitError.LFSAttributeDoesNotMatch: {
      return "Git LFS attribute found in global Git configuration does not match expected value.";
    }
    case DugiteGitError.LocalChangesOverwritten: {
      return "Unable to switch branches as there are working directory changes which would be overwritten. Please commit or stash your changes.";
    }
    case DugiteGitError.LocalPermissionDenied: {
      return "Permission denied.";
    }
    case DugiteGitError.LockFileAlreadyExists: {
      return "A lock file already exists in the repository, which blocks this operation from completing.";
    }
    case DugiteGitError.MergeConflicts: {
      return "We found some conflicts while trying to merge. Please resolve the conflicts and commit the changes.";
    }
    case DugiteGitError.NoExistingRemoteBranch: {
      return "The remote branch does not exist.";
    }
    case DugiteGitError.NoMatchingRemoteBranch: {
      return "There aren’t any remote branches that match the current branch.";
    }
    case DugiteGitError.NoMergeToAbort: {
      return "There is no merge in progress, so there is nothing to abort.";
    }
    case DugiteGitError.NonFastForwardMergeIntoEmptyHead: {
      return "The merge you attempted is not a fast-forward, so it cannot be performed on an empty branch.";
    }
    case DugiteGitError.NoSubmoduleMapping: {
      return "A submodule was removed from .gitmodules, but the folder still exists in the repository. Delete the folder, commit the change, then try again.";
    }
    case DugiteGitError.NotAGitRepository: {
      return "This is not a git repository.";
    }
    case DugiteGitError.NothingToCommit: {
      return "There are no changes to commit.";
    }
    case DugiteGitError.OutsideRepository: {
      return "This path is not a valid path inside the repository.";
    }
    case DugiteGitError.PatchDoesNotApply: {
      return "The requested changes conflict with one or more files in the repository.";
    }
    case DugiteGitError.PathDoesNotExist: {
      return "The path does not exist on disk.";
    }
    case DugiteGitError.ProtectedBranchDeleteRejected: {
      return "This branch cannot be deleted from the remote repository because it is marked as protected.";
    }
    case DugiteGitError.ProtectedBranchForcePush: {
      return "This branch is protected from force-push operations.";
    }
    case DugiteGitError.ProtectedBranchRequiredStatus: {
      return "The push was rejected by the remote server because a required status check has not been satisfied.";
    }
    case DugiteGitError.ProtectedBranchRequiresReview: {
      return "This branch is protected and any changes requires an approved review. Open a pull request with changes targeting this branch instead.";
    }
    case DugiteGitError.PushNotFastForward: {
      return "The repository has been updated since you last pulled. Try pulling before pushing.";
    }
    case DugiteGitError.PushWithFileSizeExceedingLimit: {
      return "The push operation includes a file which exceeds GitHub's file size restriction of 100MB. Please remove the file from history and try again.";
    }
    case DugiteGitError.PushWithPrivateEmail: {
      return 'Cannot push these commits as they contain an email address marked as private on GitHub. To push anyway, visit https://github.com/settings/emails, uncheck "Keep my email address private", then switch back to GitHub Desktop to push your commits. You can then enable the setting again.';
    }
    case DugiteGitError.RebaseConflicts: {
      return "We found some conflicts while trying to rebase. Please resolve the conflicts before continuing.";
    }
    case DugiteGitError.RemoteAlreadyExists: {
      return null;
    }
    case DugiteGitError.RemoteDisconnection: {
      return "The remote disconnected. Check your Internet connection and try again.";
    }
    case DugiteGitError.RevertConflicts: {
      return "To finish reverting, please merge and commit the changes.";
    }
    case DugiteGitError.SSHKeyAuditUnverified: {
      return "The SSH key is unverified.";
    }
    case DugiteGitError.SubmoduleRepositoryDoesNotExist: {
      return "A submodule points to a location which does not exist.";
    }
    case DugiteGitError.TagAlreadyExists: {
      return "A tag with that name already exists";
    }
    case DugiteGitError.UnresolvedConflicts: {
      return "There are unresolved conflicts in the working directory.";
    }
    default: {
      return `Unknown error: ${error as string}`;
    }
  }
}
