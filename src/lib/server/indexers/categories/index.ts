/**
 * Category module exports.
 */

export {
	type CategoryInfo,
	NEWZNAB_CATEGORIES,
	getCategoryById,
	getCategoryName,
	getParentCategoryId,
	getSubcategories,
	isSubcategoryOf,
	getRootCategory,
	toCategory
} from './newznabCategories';

export {
	mapYtsCategory,
	mapEztvCategory,
	detectQualityCategories,
	filterMovieCategories,
	filterTvCategories,
	hasMovieCategory,
	hasTvCategory,
	normalizeCategories
} from './CategoryMapper';
