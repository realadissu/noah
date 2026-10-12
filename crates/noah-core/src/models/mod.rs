//! Domain models module grouping all core types.

pub mod display;
pub mod ids;
pub mod schedule;
pub mod slide;
pub mod song;

pub use display::{AlertMessage, AlertTarget, BeamerEvent, DisplayMode, PresentationState, TransitionType};
pub use ids::{ScheduleId, ScheduleItemId, SlideId, SlideIndex, SongId};
pub use schedule::{MediaType, Schedule, ScheduleItem, ScheduleItemType};
pub use slide::{LyricLine, LyricToken, SectionType, Slide};
pub use song::{Song, SongMetadata};
